const socketio = require('socket.io');
module.exports = function UpdateNotifier(server) {
    var sockets = {};
    const io = socketio(server);
    io.on("connection", function (socket) {
        socket.on('register', function (id) {
            console.log('Registered socket for ' + id);
            sockets[id] = socket;
            socket.on('disconnect', function () {
                delete sockets[id];
            });
        });
        socket.emit('connected', { hello: 'world' });
    });
    return function updateById(id, data) {
        if (!sockets[id]) {
            return false;
        }
        sockets[id].emit('update', data);
    }
}