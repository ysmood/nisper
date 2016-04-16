var kit = require('nokit');
var flow = kit.require('proxy').flow;
var Promise = kit.Promise;
var async = kit.async;

var nisper = require('../lib');
var fn = require('nisp/fn/plainSpread');

module.exports = (it) => {

    it('server call client', async(function * (after) {
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
                server.call(['echo', 'hi']);
            }
        });

        var client = nisper({
            url: `ws://127.0.0.1:${app.server.address().port}`,
            sandbox: {
                echo: fn((msg) => {
                    defer.resolve(it.eq(msg, 'hi'));
                })
            }
        });

        return defer.promise;
    }));

    it('client call server', async(function * (after) {
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
                    defer.resolve(it.eq(msg, 'hi'));
                })
            }
        });

        var client = nisper({
            url: `ws://127.0.0.1:${app.server.address().port}`,
            onOpen: () => {
                client.call(['echo', 'hi']);
            }
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

};