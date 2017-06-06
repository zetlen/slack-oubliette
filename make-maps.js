const keyBy = require("lodash/fp/keyBy");

const byId = keyBy("id");
const byName = keyBy("name");
module.exports = function makeMaps(list) {
    return {
        list,
        byId: byId(list),
        byName: byName(list)
    };
}