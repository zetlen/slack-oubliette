var { Observable } = require('rxjs/Rx');

module.exports = function requestPool(
    concurrency,
    iterable,
    requestFactory,
    onRequestSuccess,
    onError,
    onCompleted
) {
    return Observable
        .from(iterable)
        .mergeMap(requestFactory, concurrency)
        .subscribe(onRequestSuccess, onError, onCompleted);
}