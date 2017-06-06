var requestPool = require('../request-pool');
var range = require('lodash/range');
jest.useRealTimers();

function resolveInMs(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    })
}

function rangeOf(number) {
    return range(1, number + 1).map(function (index) {
        var out = {};
        out.value = index;
        return out;
    });
}

function testPool(num, delay, concurrency, done) {
    expect.assertions(7 + num * 4);
    var current = 0;
    var total = 0;
    var requestFactory = jest.fn(function requestFactory(item) {
        expect(current).toBeLessThan(concurrency);
        current += 1;
        return resolveInMs(delay).then(function () {
            return {
                value: item.value,
                done: true
            };
        });
    });
    var onRequestSuccess = jest.fn(function onRequestSuccess(result) {
        expect(current).toBeLessThanOrEqual(concurrency);
        current -= 1;
        expect(result).toHaveProperty("value");
        expect(result).toHaveProperty("done", true);
        total += 1;
    });
    var onError = jest.fn(function (e) {
        throw e;
    });
    var onComplete = jest.fn(function () {
        expect(current).toBe(0);
        expect(total).toBe(num);
        expect(requestFactory).toHaveBeenCalledTimes(num);
        expect(requestFactory.mock.calls.pop()[0]).toEqual({ value: num });
        expect(onRequestSuccess).toHaveBeenCalledTimes(num);
        expect(onRequestSuccess.mock.calls.pop()[0]).toEqual({ value: num, done: true });
        expect(onError).not.toHaveBeenCalled();
        done();
    });
    requestPool(
        concurrency,
        rangeOf(num),
        requestFactory,
        onRequestSuccess,
        onError,
        onComplete
    );
}

describe('request pool', function () {
    range(1, 10).forEach(function (concurrency) {
        var num = Math.ceil(concurrency * 1.5);
        test('works for a range of ' + num + ' at concurrency ' + concurrency, function (done) {
            testPool(num, 100, concurrency, done);
        });
    });
})