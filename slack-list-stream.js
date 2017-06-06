const { Observable } = require("rxjs/Rx");
const depaginate = require("./slack-depaginator");

module.exports = function SlackListStream(rtmClient, events, pager, selector) {
    return Observable.merge(events.map(function (name) {
        return Observable.fromEvent(rtmClient, name)
    }))
        .mergeAll()
        .startWith(true)
        .mergeMap(depaginate(pager, selector))
};