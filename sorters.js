function lexical(prop) {
  return function sort(a, b) {
    var x = a[prop];
    var y = b[prop];
    if (x < y) return -1;
    if (x > y) return 1;
    return 0;
  };
}

function invert(fn) {
  return function(a, b) {
    return fn(a, b) * -1;
  };
}

function Sorters(attrs, options) {
  const exceptions = (options && options.exceptions) || {};

  const sorters = attrs.reduce(
    function(sorters, attr) {
      var sorter = exceptions[attr] || lexical(attr);
      sorters.asc[attr] = sorter;
      sorters.desc[attr] = invert(sorter);
      return sorters;
    },
    { asc: {}, desc: {} }
  );

  const getSorter = function getSorter(sortParameter) {
    const [dir, attr] = sortParameter.trim().toLowerCase().split(" ");
    if (sorters.hasOwnProperty(dir) && sorters[dir]) {
      return sorters[dir][attr];
    }
  };

  getSorter.valid = Object.keys(sorters);

  return getSorter;
}

Sorters.lexical = lexical;
Sorters.invert = invert;

module.exports = Sorters;
