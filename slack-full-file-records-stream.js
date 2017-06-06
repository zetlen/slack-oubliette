const { Observable } = require("rxjs/Rx");

module.exports = function SlackFullFileRecordsStream(files$, channelsMap$, usersMap$) {
  return Observable.combineLatest(files$, channelsMap$, usersMap$, function (
    files,
    channels,
    users
  ) {
    function toChannelName(channel) {
      return channels.byId[channel].name;
    }
    return files.map(function (file) {
      var record = Object.assign({}, file);
      if (file.user) {
        let user = users.byId[file.user];
        if (!user) {
          throw Error(`Could not find user ${file.user}`);
        }
        record.username = user.name;
      }
      if (file.channels) {
        record.channels = file.channels.map(toChannelName);
      }
      if (file.pinned_to) {
        record.pinned_to = file.pinned_to.map(toChannelName);
      }
      return record;
    });
  });
};
