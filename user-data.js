// in-memory cache for now
// Promises so that it's async by default
// to allow for actual database storage at some point
// TODO: ...not...this
var everyone = {};
var MemoryUserData = module.exports = {
    getByRequest(req, key) {
        return MemoryUserData.getById(req.user.id, key);
    },
    setByRequest(req, key, value) {
        return MemoryUserData.setById(req.user.id, key, value);
    },
    getById(id, key) {
        return Promise.resolve(everyone[id] && everyone[id][key]);
    },
    setById(id, key, value) {
        return Promise.resolve().then(function() {
            everyone[id] = everyone[id] || {};
            everyone[id][key] = value;
        });
    }
}