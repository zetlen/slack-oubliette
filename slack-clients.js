const slack = require("@slack/client");
require("dotenv").config();

module.exports = function SlackClients() {
  console.log("creating clients from token " + process.env.SLACK_TOKEN);
  const clients = {
    web: new slack.WebClient(process.env.SLACK_TOKEN),
    rtm: new slack.RtmClient(process.env.SLACK_BOT_TOKEN),
    RTM_EVENTS: slack.RTM_EVENTS
  };
  return clients;
};
