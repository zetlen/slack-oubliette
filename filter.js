const jsonQuery = require("json-query");

const defaults = {};
module.exports = function Filter(config) {
  const options = Object.assign({}, defaults, config);
  return function filterOn(filter, data) {
    var result;
    try {
      result = jsonQuery(`.[*${filter}]`, Object.assign({ data }, options));
    } catch (e) {
      return e.toString();
    }
    return (result && result.value) || [];
  };
};
