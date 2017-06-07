require("dotenv").config();
const http = require('http');
const express = require("express");
const SlackBotClients = require("./slack-clients");
const slack = require("@slack/client");
const pick = require("lodash/fp/pick");
const passport = require("passport");
const SlackStrategy = require("./slack-passport-strategy");
const bodyParser = require("body-parser");
const session = require("express-session");
const uuid = require('./uuid');
const UserData = require('./user-data');
const requestPool = require('./request-pool');
const Summarizer = require('./summarizer');
const UpdateNotifier = require('./update-notifier');
const UserRecordsFetcher = require('./user-records-fetcher');
const sharedConfig = require("./client/src/shared-config.json");

console.log("Starting up...");
const app = express();
const server = http.createServer(app);

console.log('Creating UpdateNotifier server...');
const notifyUpdates = UpdateNotifier(server);

console.log("Creating Slack bot clients...");
const botClients = SlackBotClients();

// setup the strategy using defaults
passport.use(
  new SlackStrategy(
    {
      clientID: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      scope: sharedConfig.scopes,
      skipUserProfile: true
    },
    function (accessToken, refreshToken, profile, done) {
      const id = uuid();
      UserData.setById(id, 'accessToken', accessToken)
        .then(done.bind(null, null, id));
    }
  )
);

passport.serializeUser(function (id, done) {
  done(null, id);
});

passport.deserializeUser(function (id, done) {
  Promise.all([
    UserData.getById(id, 'accessToken'),
    UserData.getById(id, 'records')
  ]).then(
    function (data) {
      done(null, {
        id: id,
        client: new slack.WebClient(data[0]),
        records: data[1]
      });
    },
    done
    );
  // botClients.web.users.info(id, function (err, res) {
  //   done(err, res.user);
  // });
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

const toRecord = pick(attrs);

const summarize = Summarizer(attrs);

console.log('Creating user records fetcher and data streams...');
const fetchRecordsForUser = UserRecordsFetcher(botClients.rtm, botClients.web);

app.use(bodyParser.text());

app.get('/whoami', function (req, res) {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }
  return res.status(200).send(req.user.id);
});

app.post("/files/delete", function (req, res) {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }
  if (!req.user.client) {
    return res.status(500).send("Missing access token for user");
  }
  var toDelete = req.body.split(",");
  requestPool(
    process.env.DELETE_CONCURRENCY || sharedConfig.deleteConcurrency,
    toDelete,
    function deleteOne(id) {
      console.log("Attempting to delete " + id);
      return req.user.client.files.delete(id).then(function () { return id; });
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

app.get("/files", function getFiles(req, res) {
  function sendRecords(data) {
    const result = summarize(data, req.query);
    if (result.error) {
      res.status(result.error.status).send(result.error.message);
    } else {
      res.json(result);
    }
  }
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }
  var id = req.user.id;
  var records = req.user.records;
  if (!id) {
    return res.status(500).send("Missing user id for user");
  }
  if (records) {
    sendRecords(records);
  } else {
    fetchRecordsForUser(
      req.user,
      sendRecords,
      function next(latest) {
        console.log(
          'Received ' + latest.length + ' new records from stream for ' + id
        );
        notifyUpdates(id, latest.length);
      },
      function error(e) {
        console.error('Error retrieving full records for ' + id);
      }
    );
  }
});

if (process.env.NODE_ENV === "production" || process.env.DEBUG_OAUTH) {
  app.use(express.static("client/build"));
}

app.get(
  sharedConfig.authPath,
  passport.authenticate('slack'),
  function (req, res) { res.redirect("/"); }
);

var port = process.env.PORT || 4001;
server.listen(port);
console.log("listening on port " + port);
botClients.rtm.start();
console.log("listening to slack rtm");
