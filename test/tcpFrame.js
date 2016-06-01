var net = require('net');
var tcpFrame = require('../lib/tcpFrame');
var kit = require('nokit');
var Deferred = kit.Deferred;
var _ = kit._;

module.exports = function (it) {
    it('string', function (after) {
        var defer = Deferred();

        after(function () {
            server.close();
        });

        var frame = 'ok';

        var server = net.createServer(function (sock) {
            tcpFrame(sock);

            sock.on('message', function (data) {
                defer.resolve(it.eq(data + '', frame));
            });
        });

        server.listen(0, function () {
            var sock = net.connect(server.address().port, '127.0.0.1', function () {
                tcpFrame(sock);

                sock.send(frame);
                sock.end();
            });
        });

        return defer.promise;
    });

    it('large buffer', function (after) {
        var defer = Deferred();

        after(function () {
            server.close();
        });

        var frame = new Buffer(1000000);

        var server = net.createServer(function (sock) {
            tcpFrame(sock);

            sock.on('message', function (data) {
                defer.resolve(it.eq(data, frame));
            });
        });

        server.listen(0, function () {
            var sock = net.connect(server.address().port, '127.0.0.1', function () {
                tcpFrame(sock);

                sock.send(frame);
                sock.end();
            });
        });

        return defer.promise;
    });

    it('frames', function (after) {
        var defer = Deferred();

        after(function () {
            server.close();
        });

        var frames = [];
        frames.push(new Buffer(1024 * 67));
        frames.push(new Buffer(1024 * 128));
        frames.push(new Buffer(37));
        frames.push(new Buffer(10));
        frames.push(new Buffer(0));
        frames.push(new Buffer(1024 * 64)); // The max tcp package size
        frames.push(new Buffer(0));


        var server = net.createServer(function (sock) {
            tcpFrame(sock);

            sock.on('message', function (data) {
                it.eq(data, frames.pop()).then(function () {
                    if (frames.length === 0) {
                        sock.end();
                        defer.resolve();
                    } else {
                        sock.send('ok');
                    }
                }).catch(function () {
                    sock.end();
                    defer.reject();
                });
            });
        });

        server.listen(0, function () {
            var sock = net.connect(server.address().port, '127.0.0.1', function () {
                tcpFrame(sock);

                sock.on('message', function () {
                    sock.send(_.last(frames));
                });

                sock.send(_.last(frames));
            });
        });

        return defer.promise;
    });

    it('multiple write', function (after) {
        var defer = Deferred();

        after(function () {
            server.close();
        });

        var frame = new Buffer(57);

        var server = net.createServer(function (sock) {
            tcpFrame(sock);

            var list = [];
            sock.on('message', function (data) {
                list.push(data);

                if (list.length === 2) {
                    defer.resolve(it.eq(list, [frame, frame]));
                }
            });
        });

        server.listen(0, function () {
            var sock = net.connect(server.address().port, '127.0.0.1', function () {
                tcpFrame(sock);

                sock.send(frame);
                sock.send(frame);
                sock.end();
            });
        });

        return defer.promise;
    });
};