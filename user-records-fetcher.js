const SlackFullFileRecordsStream = require("./slack-full-file-records-stream");
const SlackChannelsStream = require('./slack-channels-stream');
const SlackUsersStream = require('./slack-users-stream');
const SlackFilesStream = require('./slack-files-stream');
const UserData = require('./user-data');

module.exports = function UserRecordsFetcher(rtmClient, webClient) {
    console.log("Creating shared channels and users streams...");
    const channelsMap$ = SlackChannelsStream(rtmClient, webClient);
    const usersMap$ = SlackUsersStream(rtmClient, webClient);
    return function fetchRecordsForUser(user, onFirst, onSubsequent, onError) {
        console.log('Fetching records cache for user ' + user.id);
        var files$ = SlackFilesStream(rtmClient, user.client);
        var records$ = SlackFullFileRecordsStream(files$, channelsMap$, usersMap$).mergeMap(function (latest) {
            return UserData.setById(user.id, 'records', latest)
                .then(function () { return latest; });
        }).share();
        records$.take(1).subscribe(onFirst);
        records$.skip(1).subscribe(onSubsequent, onError);
    };
};