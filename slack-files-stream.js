const slack = require("@slack/client");
const SlackListStream = require('./slack-list-stream');

const FILE_EVENTS = [
  slack.RTM_EVENTS.HELLO,
  slack.RTM_EVENTS.FILE_CREATED,
  slack.RTM_EVENTS.FILE_DELETED,
  slack.RTM_EVENTS.FILE_CHANGE,
  slack.RTM_EVENTS.FILE_PUBLIC,
  slack.RTM_EVENTS.FILE_PRIVATE,
  slack.RTM_EVENTS.FILE_SHARED,
  slack.RTM_EVENTS.FILE_UNSHARED
];

module.exports = function SlackFilesStream(rtmClient, webClient) {
    return SlackListStream(
        rtmClient,
        FILE_EVENTS,
        function pager(page, callback) {
            webClient.files.list({ page, count: 500 }, callback);
        },
        function selector(result) {
            return result.files;
        }
    );
};