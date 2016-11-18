
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
        wsOptions: {}
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

    var WS = typeof WebSocket === 'undefined' ? eval('require')('ws') : WebSocket;
    var clientCall;
    var wsServer;
    var wsClient;
    var rpcSessions;
    var isClient = typeof url === 'string';
    var sendQueue;

    function init () {
        sendQueue = [];
        rpcSessions = {};
    }

    function send (ws, msg) {
        if (ws.readyState === 0) {
            sendQueue.push(msg, ws);
            return;
        }

        var data = encode(msg);
        ws.send(data);
    }

    function genOnMessage (ws, env) {
        return function (msg) {
            var data = decode(msg);
            var type = data.type;
            var id = data.id;
            var nisp = data.nisp;

            if (type === 'response') {
                if (rpcSessions[id]) rpcSessions[id](data);
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
            }, function (err) {
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
        clearTimeout(rpcSessions[id].timer);
        delete rpcSessions[id];

        if (reject)
            reject(new Error('timeout'));
    }

    function call (ws, nisp) {
        var id = genId();

        var callData = {
            type: 'request',
            id: id,
            nisp: nisp
        };

        return new Promise(function (resolve, reject) {
            send(ws, callData);

            rpcSessions[id] = function (data) {
                deleteRpcSession(id);

                if (data.error)
                    reject(new Error(JSON.stringify(data.error, 0, 4)));
                else
                    resolve(data.result);
            };

            rpcSessions[id].timer = setTimeout(deleteRpcSession, timeout, id, reject);
        });
    }

    function close (code, reason) {
        isAutoReconnect = false;

        var ids = [];
        for (var id in rpcSessions) {
            ids.push(id);
        }
        ids.forEach(function (id) {
            rpcSessions[id]({ error: { message: 'client closed' } });
        });

        if (isClient)
            wsClient.close(code, reason);
        else
            wsServer.close();
    }

    init();

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
                    send(sendQueue.pop(), sendQueue.pop());
                }

                var onMessage = genOnMessage(wsClient, onOpen(wsClient));
                wsClient.onmessage = function (e) {
                    return onMessage(e.data);
                };
            };
            wsClient.onerror = init;
            wsClient.onclose = function () {
                init();

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

        wsServer.on('error', init);
        wsServer.on('close', init);

        clientCall = function (nisp, filter) {
            if (!filter) filter = function filter (cs) {
                return cs;
            };

            return Promise.all(filter(wsServer.clients).map(function (ws) {
                return call(ws, nisp);
            }));
        };
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