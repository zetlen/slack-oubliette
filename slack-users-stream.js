const slack = require("@slack/client");
const SlackListStream = require('./slack-list-stream');
const makeMaps = require('./make-maps');

const USER_EVENTS = [slack.RTM_EVENTS.HELLO, slack.RTM_EVENTS.USER_CHANGE];

module.exports = function SlackUsersStream(rtmClient, webClient) {
    return SlackListStream(
        rtmClient,
        USER_EVENTS,
        function pager(page, callback) {
            webClient.users.list({ page, count: 500 }, callback);
        },
        function selector(result) {
            return result.members;
        }
    ).map(makeMaps);
};