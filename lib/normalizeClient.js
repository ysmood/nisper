var tcpFrame = require('./tcpFrame');


function normalizeTcpSocket (sock) {
    tcpFrame(sock);

    sock.readyState = 0;

    sock.on('connect', function () {
        sock.readyState = 1;
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

module.exports = function (sock) {
    if (typeof sock.send !== 'function') {
        normalizeTcpSocket(sock);
    }
};
