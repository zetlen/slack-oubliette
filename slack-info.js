const { Observable } = require('rxjs/Rx');
const slack = require('@slack/client');
const depaginate = require('./slack-depaginator')
const keyBy = require('lodash/fp/keyBy');

const CHANNEL_EVENTS = [
  slack.RTM_EVENTS.HELLO,
  slack.RTM_EVENTS.CHANNEL_ARCHIVE,
  slack.RTM_EVENTS.CHANNEL_RENAME,
  slack.RTM_EVENTS.CHANNEL_CREATED,
  slack.RTM_EVENTS.CHANNEL_DELETED,
  slack.RTM_EVENTS.CHANNEL_UNARCHIVE
];
const USER_EVENTS = [
  slack.RTM_EVENTS.HELLO,
  slack.RTM_EVENTS.USER_CHANGE
];
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

const byId = keyBy('id');
const byName = keyBy('name');
function makeMaps(list) {
  return {
    list,
    byId: byId(list),
    byName: byName(list)
  };
}

module.exports = function SlackInfo(clients, recordSelector) {
  const getUsers = depaginate(
    function(page, callback) {
      clients.web.users.list({ page, count: 500 }, callback);
    },
    function(result) {
      return result.members;
    }
  );
  const getChannels = depaginate(
    function(page, callback) {
      clients.web.channels.list({ page, count: 500, exclude_members: true }, callback);
    },
    function(result) {
      return result.channels;
    }
  );
  const getFiles = depaginate(
    function(page, callback) {
      clients.web.files.list({ page, count: 500 }, callback);
    },
    function(result) {
      return result.files;
    }
  )
  function rtmEventStream(name) {
    return Observable.fromEvent(clients.rtm, name);
  }
  const changes = {
    files$: Observable.merge(FILE_EVENTS.map(rtmEventStream)).mergeAll().startWith(true),
    channels$: Observable.merge(CHANNEL_EVENTS.map(rtmEventStream)).mergeAll().startWith(true),
    users$: Observable.merge(USER_EVENTS.map(rtmEventStream)).mergeAll().startWith(true)
  };
  const files$ = changes.files$.mergeMap(getFiles);
  const channels$ = changes.channels$.mergeMap(getChannels).map(makeMaps);
  const users$ = changes.users$.mergeMap(getUsers).map(makeMaps);
  const records$ = Observable.combineLatest(
    files$,
    channels$,
    users$,
    function(files, channels, users) {
      function toChannelName(channel) {
        return channels.byId[channel].name;
      }
      return files.map(function(file) {
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
        return recordSelector(record);
      });
    }
  );
  return { channels$, users$, files$, records$ };
}
