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
const bodyParser = require("body-parser");
const session = require("express-session");
const requestPool = require('./request-pool');
const sharedConfig = require("./client/src/shared-config.json");

console.log("Starting up...");
const app = express();

// setup the strategy using defaults
passport.use(
  new SlackStrategy(
    {
      clientID: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      scope: ["identity.basic"]
    },
    function (accessToken, refreshToken, profile, done) {
      done(null, profile);
    }
  )
);

passport.serializeUser(function (profile, done) {
  done(null, profile.user.id);
});

passport.deserializeUser(function (id, done) {
  clients.web.users.info(id, function (err, profile) {
    done(err, profile);
  });
});

var secret = "you have no power over me";

app.use(require("body-parser").urlencoded({ extended: true }));
app.use(session({ secret: secret, resave: false, rolling: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

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
    size: items.reduce(function (total, item) {
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
var pending = false;
function receiveNewRecords(latest) {
  error = null;
  records = latest;
  pending = false;
  console.log(`Received ${records.length} new records from stream`);
}
streams.records$.subscribe(
  receiveNewRecords,
  function (e) {
    error = e;
    pending = false;
    console.error("Received error on records stream!", e);
  }
);

app.use(bodyParser.text());

app.post("/files/delete", function (req, res) {
  var toDelete = req.body.split(",");
  requestPool(
    process.env.DELETE_CONCURRENCY || sharedConfig.deleteConcurrency,
    toDelete,
    function deleteOne(id) {
      console.log("Attempting to delete " + id);
      return clients.web.files.delete(id)
        .then(function () { return id; });
    },
    function deleted(id) {
      console.log("Successfully deleted " + id);
    },
    function errored(err) {
      console.error(err);
      res.status(500).send(err.toString());
    },
    function allDeleted() {
      console.log("Deleted " + toDelete.length + " files");
      res.status(200).end();
    }
  );
});

app.get(
  "/files",
  function getFiles(req, res) {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }
    if (!records) {
      return res.status(503).send("Cache warming up. Please wait.");
    }
    if (pending) {
      var subscription = streams.records$.subscribe(function(latest) {
        subscription.unsubscribe();
        receiveNewRecords(latest);
        getFiles(req, res);
      });
      return;
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
      function (out, attr) {
        out[attr] = {};
        return out;
      },
      { all: { size: 0, count: 0 } }
    );
    var ranges = rangeOn.reduce(function (out, attr) {
      out[attr] = { min: Infinity, max: -Infinity };
      return out;
    }, {});
    items.forEach(function (item) {
      totals.all.size += item.size;
      totals.all.count += 1;
      totalOn.forEach(function (attribute) {
        var value = item[attribute];
        if (!totals[attribute][value]) {
          totals[attribute][value] = { size: 0, count: 0 };
        }
        totals[attribute][value].size += item.size;
        totals[attribute][value].count += 1;
      });
      rangeOn.forEach(function (attribute) {
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
    totalOn.forEach(function (attribute) {
      var subtotal = totals[attribute];
      Object.keys(subtotal).forEach(function (key) {
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

if (process.env.NODE_ENV === "production" || process.env.DEBUG_OAUTH) {
  app.use(express.static("client/build"));
}

app.get(
  "/slack_redirect",
  passport.authenticate('slack'),
  function (req, res) {
    console.log("Redirecting to root");
    res.redirect("/");
  }
);
var port = process.env.PORT || 4001;
app.listen(port);
console.log("listening on port " + port);
clients.rtm.start();
console.log("listening to slack rtm");
