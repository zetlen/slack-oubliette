const humanize = require('humanize');
const Sorters = require("./sorters");
const Filter = require("./filter");

module.exports = function Summarizer(attrs) {

  const sorters = Sorters(attrs);
  const filterOn = Filter();

  const totalOn = ["filetype", "username"];
  const rangeOn = ["created", "size"];

  function totalize(items) {
    return {
      count: items.length,
      size: items.reduce(function (total, item) {
        return total + item.size;
      }, 0)
    };
  }

  return function summarize(records, query) {
    var items = records.slice();
    var sort = query.sort;
    if (sort) {
      let sorter = sorters(sort);
      if (!sorter) {
        return {
          error: {
            status: 400,
            message: 'No sorter found matching ' + query.sort + '. Valid sorters are ' + sorters.valid
          }
        };

      }
      items.sort(sorter);
    }
    var filter = query.filter;
    if (filter) {
      items = filterOn(filter, items);
      if (typeof items === "string") {
        return {
          error: {
            status: 400,
            message: items
          }
        };
      }
    }
    var totals = totalOn.reduce(
      function (out, attr) {
        out[attr] = {};
        return out;
      },
      { all: { size: 0, count: 0 } }
    );
    var ranges = rangeOn.reduce(function (out, attr) {
      out[attr] = { min: Infinity, max: -Infinity };
      return out;
    }, {});
    items.forEach(function (item) {
      totals.all.size += item.size;
      totals.all.count += 1;
      totalOn.forEach(function (attribute) {
        var value = item[attribute];
        if (!totals[attribute][value]) {
          totals[attribute][value] = { size: 0, count: 0 };
        }
        totals[attribute][value].size += item.size;
        totals[attribute][value].count += 1;
      });
      rangeOn.forEach(function (attribute) {
        ranges[attribute].min = Math.min(
          ranges[attribute].min,
          item[attribute]
        );
        ranges[attribute].max = Math.max(
          ranges[attribute].max,
          item[attribute]
        );
      });
    });
    totals.all.filesize = humanize.filesize(totals.all.size);
    totalOn.forEach(function (attribute) {
      var subtotal = totals[attribute];
      Object.keys(subtotal).forEach(function (key) {
        subtotal[key].filesize = humanize.filesize(subtotal[key].size);
      });
    });
    return {
      sorted: sort,
      filtered: filter,
      count: items.length,
      totals,
      ranges,
      items
    }
  };
}