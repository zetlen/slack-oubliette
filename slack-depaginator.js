const { Observable } = require('rxjs/Rx');
module.exports = function SlackDepaginator(requestor, selector) {
  return function getDepaginated() {
    function lastPage(res) {
      return !res.paging || res.paging.page === res.paging.pages;
    }
    return Observable.create(function(observer) {
      function pageThruFrom(page, acc) {
        requestor(page, function (err, res) {
          if (err) {
            return observer.error(err);
          }
          const selected = selector(res);
          const out = acc.concat(selector(res));
          if (lastPage(res)) {
            observer.next(out);
          } else {
            pageThruFrom(page + 1, out);
          }
        });
      }
      pageThruFrom(1, []);
    });
  }
};
