var kit = require('nokit');
var flow = kit.require('proxy').flow;
var Promise = kit.Promise;
var async = kit.async;
var net = require('net');

var nisper = require('../lib');
var nisperCall = require('../lib/call');
var fn = require('nisp/fn/plainSpread');

function createServer () {
    return new Promise(function (resolve, reject) {
        var server = net.createServer();

        server.listen(0, function () {
            resolve(server);
        });
    });
}

module.exports = (it) => {
    it.describe('socket', function (it) {

        it('server call client', async(function * (after) {
            var defer = kit.Deferred();
            var socketServer = yield createServer();

            after(() => {
                client.close();
                socketServer.close();
            });

            var server = nisper({
                socketServer: socketServer,
                isWebSocket: false,
                onOpen: () => {
                    server.call(['echo', 'hi']).then((msgs) => {
                        defer.resolve(it.eq(msgs, ['hi']));
                    });
                }
            });

            var client = nisper({
                port: socketServer.address().port,
                host: '127.0.0.1',
                isWebSocket: false,
                sandbox: {
                    echo: fn((msg) => kit.sleep(30, msg))
                }
            });

            return defer.promise;
        }));

        it('client call server', async(function * (after) {
            var defer = kit.Deferred();
            var client;

            after(() => {
                client.close();
                server.close();
            });

            var server = nisper({
                socketOptions: { port: 0 },
                sandbox: {
                    echo: fn((msg) => kit.sleep(30, msg))
                }
            });

            var httpServer = server.server._server;

            httpServer.on('listening', () => {
                client = nisper({
                    url: `ws://127.0.0.1:${httpServer.address().port}`,
                    onOpen: () => {
                        client.call(['echo', 'hi']).then((msg) => {
                            defer.resolve(it.eq(msg, 'hi'));
                        });
                    }
                });
            });

            return defer.promise;
        }));

        it('client call server once', async(function * (after) {
            var defer = kit.Deferred();

            after(() => {
                server.close();
            });

            var server = nisper({
                socketOptions: { port: 0 },
                sandbox: {
                    echo: fn((msg) => {
                        return msg;
                    })
                }
            });

            var httpServer = server.server._server;

            httpServer.on('listening', () => {
                nisperCall(
                    `ws://127.0.0.1:${httpServer.address().port}`,
                    ['echo', 'hi']
                )
                .then((msg) => {
                    defer.resolve(it.eq(msg, 'hi'));
                });
            });

            return defer.promise;
        }));

        it('async env', async(function * (after) {
            var app = flow();
            yield app.listen(0);
            var defer = kit.Deferred();

            after(() => {
                client.close();
                app.close();
            });

            var server = nisper({
                httpServer: app.server,
                onOpen: () => kit.sleep(30, 'ok'),
                sandbox: {
                    echo: fn(function (msg) {
                        defer.resolve(it.eq(this + msg, 'ok!'));
                    })
                }
            });

            var client = nisper({
                url: `ws://127.0.0.1:${app.server.address().port}`,
                onOpen: () => {
                    client.call(['echo', '!']);
                }
            });

            return defer.promise;
        }));

        it('client call server multiple times', async(function * (after) {
            var app = flow();
            yield app.listen(0);
            var defer = kit.Deferred();

            after(() => {
                client.close();
                app.close();
            });

            var count = 0;

            var server = nisper({
                httpServer: app.server,
                sandbox: {
                    echo: fn(() => {
                        count++;
                        if (count === 100)
                            defer.resolve();
                    })
                }
            });

            var client = nisper({
                url: `ws://127.0.0.1:${app.server.address().port}`,
                onOpen: () => {
                    for (var i = 0; i < 100; i++) {
                        client.call(['echo']);
                    }
                }
            });

            return defer.promise;
        }));

        it('client call server wait connection', async(function * (after) {
            var app = flow();
            yield app.listen(0);
            var defer = kit.Deferred();

            after(() => {
                client.close();
                app.close();
            });

            var count = 0;

            var server = nisper({
                httpServer: app.server,
                sandbox: {
                    echo: fn(() => {
                        if (++count === 3)
                            defer.resolve();
                    })
                }
            });

            var client = nisper({
                url: `ws://127.0.0.1:${app.server.address().port}`
            });

            yield client.call(['echo']);
            yield client.call(['echo']);
            yield client.call(['echo']);

            return defer.promise;
        }));

        it('server call client error', async(function * (after) {
            var app = flow();
            yield app.listen(0);
            var defer = kit.Deferred();

            after(() => {
                client.close();
                app.close();
            });

            var server = nisper({
                httpServer: app.server,
                onOpen: () => {
                    server.call(['echo', 'hi']).catch((err) => {
                        defer.resolve(it.eq(JSON.parse(err.message).message, 'err'));
                    });
                }
            });

            var client = nisper({
                url: `ws://127.0.0.1:${app.server.address().port}`,
                sandbox: {
                    echo: fn((msg) => {
                        throw 'err';
                    })
                }
            });

            return defer.promise;
        }));

        it('client call server error', async(function * (after) {
            var app = flow();
            yield app.listen(0);
            var defer = kit.Deferred();

            after(() => {
                client.close();
                app.close();
            });

            var server = nisper({
                httpServer: app.server,
                sandbox: {
                    echo: fn((msg) => {
                        throw 'err';
                    })
                }
            });

            var client = nisper({
                url: `ws://127.0.0.1:${app.server.address().port}`,
                onOpen: () => {
                    client.call(['echo', 'hi']).catch((err) => {
                        defer.resolve(it.eq(JSON.parse(err.message).message, 'err'));
                    });
                }
            });

            return defer.promise;
        }));

        it('msgpack', async(function * (after) {
            var msgpack = require('msgpack-js');
            var app = flow();
            yield app.listen(0);
            var defer = kit.Deferred();

            after(() => {
                client.close();
                app.close();
            });

            var server = nisper({
                httpServer: app.server,
                encode: msgpack.encode,
                decode: msgpack.decode,
                onOpen: () => {
                    server.call(['echo', new Buffer([0, 1, 2, 3])]);
                }
            });

            var client = nisper({
                url: `ws://127.0.0.1:${app.server.address().port}`,
                encode: msgpack.encode,
                decode: msgpack.decode,
                sandbox: {
                    echo: fn((msg) => {
                        defer.resolve(it.eq(msg, [0, 1, 2, 3]));
                    })
                }
            });

            return defer.promise;
        }));

    });
};