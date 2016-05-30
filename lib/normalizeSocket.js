var tcpFrame = require('./tcpFrame');

module.exports = function (sock) {
    if (typeof sock.send !== 'function') {
        tcpFrame(sock);

        sock.on('connect', function () {
            if (sock.onopen)
                sock.onopen();
        });

        sock.on('message', function (msg) {
            if (sock.onmessage)
                sock.onmessage(msg);
        });

        sock.on('error', function (err) {
            if (sock.onerror)
                sock.onerror(err);
        });

        sock.on('close', function () {
            if (sock.onclose)
                sock.onclose();
        });
    }
};
