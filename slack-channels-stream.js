const slack = require("@slack/client");
const SlackListStream = require('./slack-list-stream');
const makeMaps = require('./make-maps');

const CHANNEL_EVENTS = [
    slack.RTM_EVENTS.HELLO,
    slack.RTM_EVENTS.CHANNEL_ARCHIVE,
    slack.RTM_EVENTS.CHANNEL_RENAME,
    slack.RTM_EVENTS.CHANNEL_CREATED,
    slack.RTM_EVENTS.CHANNEL_DELETED,
    slack.RTM_EVENTS.CHANNEL_UNARCHIVE
];

module.exports = function SlackChannelsStream(rtmClient, webClient) {
    return SlackListStream(
        rtmClient,
        CHANNEL_EVENTS,
        function pager(page, callback) {
            webClient.channels.list(
                { page, count: 500, exclude_members: true },
                callback
            );
        },
        function selector(result) {
            return result.channels;
        }
    ).map(makeMaps);
}