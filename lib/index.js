
'use strict';

var Nisp = require('nisp');
var Promise = require('yaku');

function genId () {
    return Math.floor(Math.random() * 100000000);
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
        onOpen: function onOpen (ws) {
            return ws;
        },
        filter: function filter () {
            return true;
        },
        isAutoReconnect: true,
        retrySpan: 1000,
        encode: function encode (data) {
            return JSON.stringify(data, 0, 4);
        },
        decode: function decode (data) {
            return JSON.parse(data, 0, 4);
        },
        wsOption: {}
    }, opts);

    var httpServer = opts.httpServer;
    var url = opts.url;
    var sandbox = opts.sandbox;
    var onOpen = opts.onOpen;
    var filter = opts.filter;
    var isAutoReconnect = opts.isAutoReconnect;
    var retrySpan = opts.retrySpan;
    var encode = opts.encode;
    var decode = opts.decode;
    var wsOption = opts.wsOption;

    var WebSocket;
    var clientCall;
    var wsServer;
    var wsClient;
    var rpcSessions = {};

    function initRpcSessions () {
        rpcSessions = {};
    }

    function send (ws, msg) {
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
                        message: err instanceof Error ? err.message : err,
                        nisp: nisp
                    }
                });
            });
        };
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
                delete rpcSessions[id];

                if (data.error) reject(new Error(JSON.stringify(data.error, 0, 4)));else resolve(data.result);
            };
        });
    }

    function close (code, reason) {
        isAutoReconnect = false;
        if (httpServer)
            wsServer.close();
        else
            wsClient.close(code, reason);
    }

    if (typeof WebSocket !== 'function') {
        WebSocket = eval('require')('ws');
    }

    if (httpServer) {
        wsServer = new WebSocket.Server(extend(wsOption, { server: httpServer }));

        wsServer.on('connection', function (ws) {
            if (!filter(ws)) return;
            ws.on('message', genOnMessage(ws, onOpen(ws)));
        });

        wsServer.on('error', initRpcSessions);
        wsServer.on('close', initRpcSessions);

        clientCall = function clientCall (nisp, filter) {
            if (!filter) filter = function filter (cs) {
                return cs;
            };

            return Promise.all(filter(wsServer.clients).map(function (ws) {
                return call(ws, nisp);
            }));
        };
    } else {
        var connect = function connect () {
            try {
                wsClient = new WebSocket(url);
            } catch (err) {
                if (isAutoReconnect) {
                    return setTimeout(connect, retrySpan);
                } else {
                    throw err;
                }
            }

            wsClient.onopen = function () {
                var onMessage = genOnMessage(wsClient, onOpen(wsClient));
                wsClient.onmessage = function (e) {
                    return onMessage(e.data);
                };
            };
            wsClient.onerror = initRpcSessions;
            wsClient.onclose = function () {
                initRpcSessions();

                if (isAutoReconnect) {
                    setTimeout(connect, retrySpan);
                }
            };
        };

        connect();

        clientCall = function clientCall (nisp, opts) {
            return call(wsClient, nisp, opts);
        };
    }

    return {
        sandbox: sandbox,
        close: close,
        websocketClient: wsClient,
        call: clientCall
    };
};