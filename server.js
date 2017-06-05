const express = require("express");
require("dotenv").config();
const SlackClients = require("./slack-clients");
const SlackStreams = require("./slack-info");
const Sorters = require("./sorters");
const Filter = require("./filter");
const pick = require("lodash/fp/pick");
const humanize = require("humanize");
const passport = require("passport");
const SlackStrategy = require("./slack-passport-strategy");
// const apicache = require("apicache");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const PromisePool = require("es6-promise-pool");
const sharedConfig = require("./client/src/shared-config.json");

console.log("Starting up...");
const app = express();
// app.set("json spaces", 1);

// setup the strategy using defaults
passport.use(
  new SlackStrategy(
    {
      clientID: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      scope: ["identity.basic"]
    },
    function(accessToken, refreshToken, profile, done) {
      // optionally persist profile data
      console.log(accessToken, refreshToken, profile);
      done(null, profile);
    }
  )
);

var secret = "you have no power over me";

app.use(require("body-parser").urlencoded({ extended: true }));
app.use(cookieParser(secret));
app.use(session({ secret: secret }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(profile, done) {
  console.log('i serialized', profile.user.id);
  done(null, profile.user.id);
});

passport.deserializeUser(function(id, done) {
  console.log('to deserialize ', id);
  clients.web.users.info(id, function(err, user) {
  console.log('i deserialized ', user, err);
    done(err, user);
  });
});

const attrs = [
  "id",
  "created",
  "name",
  "title",
  "filetype",
  "size",
  `thumb_${sharedConfig.thumbSize}`,
  "url_private",
  "username"
];

const totalOn = ["filetype", "username"];
const rangeOn = ["created", "size"];

function totalize(items) {
  return {
    count: items.length,
    size: items.reduce(function(total, item) {
      return total + item.size;
    }, 0)
  };
}

const toRecord = pick(attrs);

console.log("Creating sorters...");
const sorters = Sorters(attrs, {
  exceptions: {
    channels: Sorters.lexical("length"),
    pinned_to: Sorters.lexical("length")
  }
});

console.log("Creating filter...");
const filterOn = Filter();

console.log("Creating Slack clients...");
const clients = SlackClients();

console.log("Initial files cache load...");
const streams = SlackStreams(clients, toRecord);

var records;
var error;
streams.records$.subscribe(
  function(latest) {
    error = null;
    records = latest;
    console.log(`Received ${records.length} new records from stream`);
    // apicache.clear();
  },
  function(e) {
    error = e;
    console.error("Received error on records stream!", e);
    // apicache.clear();
  }
);

// var isProd = process.env.NODE_ENV === "production";

// var cache = apicache
//   .options({
//     debug: isProd,
//     statusCodes: {
//       include: [200]
//     }
//   })
//   .middleware("1 minute", () => isProd);

app.use(bodyParser.text());

app.post("/files/delete", function(req, res) {
  var toDelete = req.body.split(",");
  function deletor() {
    var next = toDelete.pop();
    if (!next) {
      return null;
    }
    console.log("Attempting to delete " + toDelete);
    return clients.web.files.delete(next).then(function() {
      console.log("Successfully deleted " + toDelete);
    });
  }
  var concurrency =
    process.env.DELETE_CONCURRENCY || sharedConfig.deleteConcurrency;
  var pool = new PromisePool(deletor, concurrency);
  var poolPromise = pool.start();
  poolPromise
    .then(function() {
      res.status(200).end();
    })
    .catch(function(err) {
      res.status(500).send(err.toString());
    });
});

app.get(
  "/files",
  /*cache, */ function(req, res) {
    if (!req.user) {
      return res.status(401).end();
    }
    if (!records) {
      return res.status(503).send("Cache warming up. Please wait.");
    }
    var items = records.slice();
    var sort = req.query.sort;
    if (sort) {
      let sorter = sorters(sort);
      if (!sorter) {
        return res
          .status(400)
          .send(
            `No sorter found matching ${req.query
              .sort}. Valid sorters are ${sorters.valid}`
          );
      }
      items.sort(sorter);
    }
    var filter = req.query.filter;
    if (filter) {
      items = filterOn(filter, items);
      if (typeof items === "string") {
        return res.status(400).send(items);
      }
    }
    var totals = totalOn.reduce(
      function(out, attr) {
        out[attr] = {};
        return out;
      },
      { all: { size: 0, count: 0 } }
    );
    var ranges = rangeOn.reduce(function(out, attr) {
      out[attr] = { min: Infinity, max: -Infinity };
      return out;
    }, {});
    items.forEach(function(item) {
      totals.all.size += item.size;
      totals.all.count += 1;
      totalOn.forEach(function(attribute) {
        var value = item[attribute];
        if (!totals[attribute][value]) {
          totals[attribute][value] = { size: 0, count: 0 };
        }
        totals[attribute][value].size += item.size;
        totals[attribute][value].count += 1;
      });
      rangeOn.forEach(function(attribute) {
        ranges[attribute].min = Math.min(
          ranges[attribute].min,
          item[attribute]
        );
        ranges[attribute].max = Math.max(
          ranges[attribute].max,
          item[attribute]
        );
      });
    });
    totals.all.filesize = humanize.filesize(totals.all.size);
    totalOn.forEach(function(attribute) {
      var subtotal = totals[attribute];
      Object.keys(subtotal).forEach(function(key) {
        subtotal[key].filesize = humanize.filesize(subtotal[key].size);
      });
    });
    res.json({
      sorted: sort,
      filtered: filter,
      count: items.length,
      totals,
      ranges,
      items
    });
  }
);

if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
}

const autt = passport.authorize("slack", { successRedirect: "/" });
function proxyauth() {
  return autt.apply(this, arguments);
}

app.get(
  "/slack_redirect",
  proxyauth,
  function(req, res) {
    console.log("Redirecting to root");
    res.redirect("/");
  }
);

var port = process.env.PORT || 4001;
app.listen(port);
console.log("listening on port " + port);
clients.rtm.start();
console.log("listening to slack rtm");
