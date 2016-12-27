
'use strict';

var Nisp = require('nisp');
var Promise = require('yaku');

function genId () {
    return Math.floor(Math.random() * 100000000).toString(36);
}

function extend (to, from) {
    var k;
    for (k in from) {
        to[k] = from[k];
    }
    return to;
}

module.exports = function (opts) {
    opts = extend({
        httpServer: null,
        url: null,
        sandbox: {},
        onOpen: function (ws) {
            return ws;
        },
        onRequest: function (req, res) {
            return req;
        },
        filter: function () {
            return true;
        },
        error: function (err) {
            return err instanceof Error ? err.stack.split('\n') : err;
        },
        isAutoReconnect: true,
        retrySpan: 1000,
        timeout: 1000 * 60 * 2, // 2 minutes
        encode: function (data) {
            return JSON.stringify(data, 0, 4);
        },
        decode: function (data) {
            return JSON.parse(data + '', 0, 4);
        },
        wsOptions: {},
        isDebug: false
    }, opts);

    var httpServer = opts.httpServer;
    var url = opts.url;
    var sandbox = opts.sandbox;
    var onOpen = opts.onOpen;
    var onRequest = opts.onRequest;
    var filter = opts.filter;
    var error = opts.error;
    var isAutoReconnect = opts.isAutoReconnect;
    var retrySpan = opts.retrySpan;
    var timeout = opts.timeout;
    var encode = opts.encode;
    var decode = opts.decode;
    var wsOptions = opts.wsOptions;
    var isDebug = opts.isDebug;

    var WS = typeof WebSocket === 'undefined' ? eval('require')('ws') : WebSocket;
    var clientCall;
    var wsServer;
    var wsClient;
    var sessions = {};
    var isClient = typeof url === 'string';
    var sendQueue = [];

    function send (ws, msg) {
        if (ws.readyState === 1) {
            var data = encode(msg);
            ws.send(data);
        } else {
            sendQueue.push(msg);
        }
    }

    function genOnMessage (ws, env) {
        return function (msg) {
            var data = decode(msg);
            var type = data.type;
            var id = data.id;
            var nisp = data.nisp;

            if (type === 'response') {
                sessionDone(id, data);
                return;
            }

            return Promise.resolve(env).then(function (env) {
                return Nisp(nisp, sandbox, env);
            }).then(function (result) {
                send(ws, {
                    type: 'response',
                    id: id,
                    result: result
                });
            }).catch(function (err) {
                send(ws, {
                    type: 'response',
                    id: id,
                    error: {
                        message: error(err)
                    }
                });
            });
        };
    }

    function deleteRpcSession (id, reject) {
        var session = sessions[id];

        if (!session) return;

        clearTimeout(session.timer);
        delete sessions[id];

        if (reject)
            reject(new Error('timeout'));
    }

    function sessionDone (id, data) {
        var session = sessions[id];

        if (!session) return;

        if (data.error) {
            if (isDebug) {
                session.error.message = JSON.stringify(data.error, 0, 4);
                session.reject(session.error);
            } else {
                session.reject(new Error(JSON.stringify(data.error, 0, 4)));
            }
        } else {
            session.resolve(data.result);
        }

        deleteRpcSession(id);
    }

    function call (ws, nisp) {
        var id = genId();

        var callData = {
            type: 'request',
            id: id,
            nisp: nisp
        };

        if (isDebug)
            var error = new Error();

        return new Promise(function (resolve, reject) {
            send(ws, callData);

            sessions[id] = {
                resolve: resolve,
                reject: reject,
                timer: setTimeout(deleteRpcSession, timeout, id, reject)
            };

            if (isDebug)
                sessions[id].error = error;
        });
    }

    function close (code, reason) {
        isAutoReconnect = false;

        sendQueue.length = 0;

        var ids = [];
        for (var id in sessions) {
            ids.push(id);
        }
        ids.forEach(function (id) {
            sessionDone(id, { error: { message: 'client closed' } });
        });

        if (isClient)
            wsClient.close(code, reason);
        else
            wsServer.close();
    }

    // If url is specified, init the client instance, else init the a server instance.
    if (isClient) {
        var connect = function () {
            try {
                wsClient = new WS(url);
            } catch (err) {
                if (isAutoReconnect) {
                    return setTimeout(connect, retrySpan);
                } else {
                    throw err;
                }
            }

            wsClient.onopen = function () {
                while (sendQueue.length > 0) {
                    send(wsClient, sendQueue.pop());
                }

                var onMessage = genOnMessage(wsClient, onOpen(wsClient));
                wsClient.onmessage = function (e) {
                    return onMessage(e.data);
                };
            };
            wsClient.onclose = function () {
                if (isAutoReconnect) {
                    setTimeout(connect, retrySpan);
                }
            };
        };

        connect();

        clientCall = function (nisp) {
            return call(wsClient, nisp);
        };
    } else {
        if (httpServer) {
            wsServer = new WS.Server(extend(wsOptions, { server: httpServer }));
        } else {
            wsServer = new WS.Server(wsOptions);
        }

        wsServer.on('connection', function (ws) {
            if (!filter(ws)) return;
            ws.on('message', genOnMessage(ws, onOpen(ws)));
        });

        clientCall = call;
    }

    function middleware (req, res) {
        return Promise.all([
            onRequest(req, res),
            new Promise(function (resolve, reject) {
                var buf = new Buffer(0);
                req.on('data', function (chunk) {
                    buf = Buffer.concat([buf, chunk]);
                });
                req.on('error', reject);
                req.on('end', function () {
                    resolve(buf);
                });
            })
        ]).then(function (ret) {
            var env = ret[0];
            var nisp = decode(ret[1]);

            return Nisp(nisp, sandbox, env);
        }).then(function (result) {
            res.end(encode({
                result: result
            }));
        }, function (err) {
            res.end(encode({
                error: {
                    message: error(err)
                }
            }));
        });
    }

    return {
        sandbox: sandbox,
        close: close,
        websocketServer: wsServer,
        websocketClient: wsClient,
        middleware: middleware,
        call: clientCall
    };
};