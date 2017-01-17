"use strict";
const kit = require("nokit");
const proxy = kit.require('proxy');
const flow = proxy.flow;
const midToFlow = proxy.midToFlow;
const async = kit.async;
const lib_1 = require("../lib");
const call_1 = require("../lib/call");
const _1 = require("nisp/lib/$");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (it) => {
    it('server call client', async(function* (after) {
        const app = flow();
        yield app.listen(0);
        const defer = kit.Deferred();
        after(() => {
            client.close();
            app.close();
        });
        const server = lib_1.default({
            httpServer: app.server,
            onOpen: (ws) => {
                server.callx(ws) `(echo ${{ data: 'hi' }})`.then((msg) => {
                    defer.resolve(it.eq(msg, { data: 'hi' }));
                });
            }
        });
        var client = lib_1.default({
            url: `ws://127.0.0.1:${app.server.address().port}`,
            sandbox: {
                $: _1.default,
                echo: (msg) => kit.sleep(30, msg)
            }
        });
        return defer.promise;
    }));
    it('wrong response encode', async(function* (after) {
        const app = flow();
        yield app.listen(0);
        const defer = kit.Deferred();
        after(() => {
            client.close();
            app.close();
        });
        const server = lib_1.default({
            httpServer: app.server,
            onOpen: (ws) => {
                server.call(ws, ['echo']).catch(err => {
                    defer.resolve(it.eq(JSON.parse(err.message).message[0], 'TypeError: Converting circular structure to JSON'));
                });
            }
        });
        var client = lib_1.default({
            url: `ws://127.0.0.1:${app.server.address().port}`,
            sandbox: {
                echo() {
                    const a = { a: null };
                    a.a = a;
                    return a;
                }
            }
        });
        return defer.promise;
    }));
    it('client call server', after => {
        const defer = kit.Deferred();
        let client;
        after(() => {
            client.close();
            server.close();
        });
        var server = lib_1.default({
            wsOptions: { port: 0 },
            sandbox: {
                echo: (msg) => kit.sleep(30, msg)
            }
        });
        const httpServer = server.websocketServer._server;
        httpServer.on('listening', () => {
            client = lib_1.default({
                url: `ws://127.0.0.1:${httpServer.address().port}`,
                onOpen: () => {
                    client.callx `(echo hi)`.then((msg) => {
                        defer.resolve(it.eq(msg, 'hi'));
                    });
                }
            });
        });
        return defer.promise;
    });
    it('client call server once', after => {
        const defer = kit.Deferred();
        after(() => {
            server.close();
        });
        var server = lib_1.default({
            wsOptions: { port: 0 },
            sandbox: {
                echo: (msg) => {
                    return msg;
                }
            }
        });
        const httpServer = server.websocketServer._server;
        httpServer.on('listening', () => {
            call_1.default(`ws://127.0.0.1:${httpServer.address().port}`, ['echo', 'hi'])
                .then((msg) => {
                defer.resolve(it.eq(msg, 'hi'));
            });
        });
        return defer.promise;
    });
    it('async env', async(function* (after) {
        const app = flow();
        yield app.listen(0);
        const defer = kit.Deferred();
        after(() => {
            client.close();
            app.close();
        });
        lib_1.default({
            httpServer: app.server,
            onOpen: () => kit.sleep(30, 'ok'),
            sandbox: {
                echo: function (msg) {
                    setTimeout(defer.resolve, 30, it.eq(this.env + msg, 'ok!'));
                }
            }
        });
        var client = lib_1.default({
            url: `ws://127.0.0.1:${app.server.address().port}`,
            onOpen: () => {
                client.call(['echo', '!']);
            }
        });
        return defer.promise;
    }));
    it('client call server multiple times', async(function* (after) {
        const app = flow();
        yield app.listen(0);
        const defer = kit.Deferred();
        after(() => {
            client.close();
            app.close();
        });
        let count = 0;
        lib_1.default({
            httpServer: app.server,
            sandbox: {
                echo: () => {
                    count++;
                    if (count === 100)
                        setTimeout(defer.resolve, 30);
                }
            }
        });
        var client = lib_1.default({
            url: `ws://127.0.0.1:${app.server.address().port}`,
            onOpen: () => {
                for (let i = 0; i < 100; i++) {
                    client.call(['echo']);
                }
            }
        });
        return defer.promise;
    }));
    it('client call server wait connection', async(function* (after) {
        const app = flow();
        yield app.listen(0);
        const defer = kit.Deferred();
        after(() => {
            client.close();
            app.close();
        });
        let count = 0;
        lib_1.default({
            httpServer: app.server,
            sandbox: {
                echo: () => {
                    if (++count === 3)
                        setTimeout(defer.resolve, 30);
                }
            }
        });
        var client = lib_1.default({
            url: `ws://127.0.0.1:${app.server.address().port}`
        });
        yield client.call(['echo']);
        yield client.call(['echo']);
        yield client.call(['echo']);
        return defer.promise;
    }));
    it('server call client error', async(function* (after) {
        const app = flow();
        yield app.listen(0);
        const defer = kit.Deferred();
        after(() => {
            client.close();
            app.close();
        });
        const server = lib_1.default({
            httpServer: app.server,
            onOpen: (ws) => {
                server.call(ws, ['echo', 'hi']).catch((err) => {
                    defer.resolve(it.eq(JSON.parse(err.message).message, 'err'));
                });
            }
        });
        var client = lib_1.default({
            url: `ws://127.0.0.1:${app.server.address().port}`,
            sandbox: {
                echo: () => {
                    throw 'err';
                }
            }
        });
        return defer.promise;
    }));
    it('client call server error', async(function* (after) {
        const app = flow();
        yield app.listen(0);
        const defer = kit.Deferred();
        after(() => {
            client.close();
            app.close();
        });
        lib_1.default({
            httpServer: app.server,
            sandbox: {
                echo: () => {
                    throw 'err';
                }
            }
        });
        var client = lib_1.default({
            url: `ws://127.0.0.1:${app.server.address().port}`,
            onOpen: () => {
                client.call(['echo', 'hi']).catch((err) => {
                    defer.resolve(it.eq(JSON.parse(err.message).message, 'err'));
                });
            }
        });
        return defer.promise;
    }));
    it('msgpack', async(function* (after) {
        const msgpack = require('msgpack-lite');
        const app = flow();
        yield app.listen(0);
        const defer = kit.Deferred();
        after(() => {
            client.close();
            app.close();
        });
        const server = lib_1.default({
            httpServer: app.server,
            encode: msgpack.encode,
            decode: msgpack.decode,
            onOpen: (ws) => {
                server.call(ws, ['echo', { msg: new Buffer([0, 1, 2, 3]) }]);
            }
        });
        var client = lib_1.default({
            url: `ws://127.0.0.1:${app.server.address().port}`,
            encode: msgpack.encode,
            decode: msgpack.decode,
            sandbox: {
                echo: (data) => {
                    defer.resolve(it.eq([Buffer.isBuffer(data.msg), data.msg], [true, [0, 1, 2, 3]]));
                }
            }
        });
        return defer.promise;
    }));
    it('timeout', async(function* (after) {
        const app = flow();
        yield app.listen(0);
        const defer = kit.Deferred();
        after(() => {
            client.close();
            app.close();
        });
        const server = lib_1.default({
            httpServer: app.server,
            timeout: 100,
            onOpen: (ws) => {
                server.call(ws, ['echo']).catch(err => {
                    defer.resolve(it.eq(err.message, 'timeout'));
                });
            }
        });
        var client = lib_1.default({
            url: `ws://127.0.0.1:${app.server.address().port}`,
            sandbox: {
                echo: () => {
                    return kit.never();
                }
            }
        });
        return defer.promise;
    }));
    it('middleware', async(function* (after) {
        const app = flow();
        yield app.listen(0);
        const defer = kit.Deferred();
        after(() => {
            app.close();
        });
        const server = lib_1.default({
            httpServer: app.server,
            sandbox: {
                echo: (msg) => {
                    return msg;
                }
            }
        });
        app.push(midToFlow(server.middleware));
        const ret = yield kit.request({
            url: `http://127.0.0.1:${app.server.address().port}`,
            reqData: JSON.stringify(["echo", 'hey'])
        });
        defer.resolve(it.eq(JSON.parse(ret), { result: 'hey' }));
        return defer.promise;
    }));
};
