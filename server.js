require("dotenv").config();
const http = require('http');
const express = require("express");
const slack = require("@slack/client");
const SlackBotClients = require("./slack-clients");
const SlackFullFileRecordsStream = require("./slack-full-file-records-stream");
const SlackChannelsStream = require('./slack-channels-stream');
const SlackUsersStream = require('./slack-users-stream');
const SlackFilesStream = require('./slack-files-stream');
const pick = require("lodash/fp/pick");
const passport = require("passport");
const SlackStrategy = require("./slack-passport-strategy");
const bodyParser = require("body-parser");
const session = require("express-session");
const UserData = require('./user-data');
const requestPool = require('./request-pool');
const Summarizer = require('./summarizer');
const UpdateNotifier = require('./update-notifier');
const sharedConfig = require("./client/src/shared-config.json");

console.log("Starting up...");
const app = express();
const server = http.createServer(app);
const notifyUpdates = UpdateNotifier(server);

console.log("Creating Slack bot clients...");
const botClients = SlackBotClients();

// setup the strategy using defaults
passport.use(
  new SlackStrategy(
    {
      clientID: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      scope: sharedConfig.scopes
    },
    function (accessToken, refreshToken, profile, done) {
      UserData.setById(profile.user.id, 'accessToken', accessToken)
        .then(done.bind(null, null, profile));
    }
  )
);

passport.serializeUser(function (profile, done) {
  done(null, profile.user.id);
});

passport.deserializeUser(function (id, done) {
  botClients.web.users.info(id, function (err, res) {
    done(err, res.user);
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

const toRecord = pick(attrs);

const summarize = Summarizer(attrs);

console.log("Creating shared channels and users streams...");
const channelsMap$ = SlackChannelsStream(botClients.rtm, botClients.web);
const usersMap$ = SlackUsersStream(botClients.rtm, botClients.web);

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
  var toDelete = req.body.split(",");
  UserData.getByRequest(req, 'accessToken').then(function (accessToken) {
    if (!accessToken) {
      return res.status(500).send("Missing access token for user");
    }
    var deleteClient = new slack.WebClient(accessToken);
    requestPool(
      process.env.DELETE_CONCURRENCY || sharedConfig.deleteConcurrency,
      toDelete,
      function deleteOne(id) {
        console.log("Attempting to delete " + id);
        return deleteClient.files.delete(id).then(function () { return id; });
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
});

app.get("/files", function getFiles(req, res) {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }
  Promise.all([
    UserData.getByRequest(req, 'records'),
    UserData.getByRequest(req, 'accessToken')
  ]).then(function (data) {
    var records = data[0];
    var accessToken = data[1];
    var id = req.user.id;
    if (!accessToken) {
      return res.status(500).send("Missing access token for user");
    }
    if (records) {
      const result = summarize(records, req.query);
      if (result.error) {
        return res.status(result.error.status).send(result.error.message);
      }
      return res.json(result);
    }
    console.log('Warming up records cache for user ' + id);
    var files$ = SlackFilesStream(
      botClients.rtm,
      new slack.WebClient(accessToken)
    );
    var records$ = SlackFullFileRecordsStream(files$, channelsMap$, usersMap$)
      .mergeMap(function (latest) {
        return UserData.setByRequest(req, 'records', latest)
        .then(function() { return latest.length; });
      })
      .share();
    records$.take(1).subscribe(getFiles.bind(null, req, res));
    records$.subscribe(
      function next(count) {
        console.log(
          'Received ' + count + ' new records from stream for ' + id
        );
        notifyUpdates(id, count);
      },
      function error(e) {
        console.error('Error retrieving full records for ' + id);
      }
    );
  })
  .catch(function(e) {
    res.status(500).send('Error retrieving user data');
  });
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
