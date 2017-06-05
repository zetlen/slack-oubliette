const slack = require("@slack/client");

module.exports = function SlackClients() {
  const clients = {
    web: new slack.WebClient(process.env.SLACK_TOKEN),
    rtm: new slack.RtmClient(process.env.SLACK_BOT_TOKEN),
    RTM_EVENTS: slack.RTM_EVENTS
  };
  return clients;
};
