const { Observable } = require("rxjs/Rx");
const debug = require('util').debuglog('depaginator');
module.exports = function SlackDepaginator(requestor, selector) {
  debug('creating depaginator');
  return function getDepaginated() {
    debug('depaginator called');
    function lastPage(res) {
      return !res.paging || res.paging.page >= res.paging.pages;
    }
    return Observable.create(function(observer) {
      function pageThruFrom(page, acc) {
        debug('requesting page ' + page);
        requestor(page, function(err, res) {
          debug('retrieved page ' + page);
          if (err) {
            debug('depaginator error');
            return observer.error(err);
          }
          const selected = selector(res);
          const out = acc.concat(selector(res));
          if (lastPage(res)) {
            debug('last page found');
            observer.next(out);
          } else {
            debug('next page');
            pageThruFrom(page + 1, out);
          }
        });
      }
      pageThruFrom(1, []);
    });
  };
};
