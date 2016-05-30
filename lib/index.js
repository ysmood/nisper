
'use strict';

var Nisp = require('nisp');
var Promise = require('yaku');
var tcpFrame = require('./tcpFrame');
var normalizeSocket = require('./normalizeSocket');

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
        socketServer: null,
        url: null,
        sandbox: {},
        isWebSocket: true,
        onOpen: function (sock) {
            return sock;
        },
        filter: function () {
            return true;
        },
        error: function (err) {
            return err instanceof Error ? err.stack.split('\n') : err;
        },
        isAutoReconnect: true,
        retrySpan: 1000,
        encode: function (data) {
            return JSON.stringify(data, 0, 4);
        },
        decode: function (data) {
            return JSON.parse(data, 0, 4);
        },
        socketOptions: {}
    }, opts);

    var httpServer = opts.httpServer;
    var socketServer = opts.socketServer;
    var url = opts.url;
    var port = opts.port;
    var host = opts.host;
    var isWebSocket = opts.isWebSocket;
    var sandbox = opts.sandbox;
    var onOpen = opts.onOpen;
    var filter = opts.filter;
    var error = opts.error;
    var isAutoReconnect = opts.isAutoReconnect;
    var retrySpan = opts.retrySpan;
    var encode = opts.encode;
    var decode = opts.decode;
    var socketOptions = opts.socketOptions;

    var clientCall;
    var server;
    var client;
    var rpcSessions;
    var isClient = typeof url === 'string';
    var sendQueue;
    var Socket;
    var Server;

    if (isWebSocket) {
        Socket = typeof WebSocket === 'undefined' ? eval('require')('ws') : WebSocket;
        Server = eval('require')('ws').Server;
    } else {
        Socket = eval('require')('net').Socket;
        Server = eval('require')('net').Server;
    }

    function init () {
        sendQueue = [];
        rpcSessions = {};
    }

    function send (sock, msg) {
        if (sock.readyState === 0) {
            sendQueue.push(msg, sock);
            return;
        }

        var data = encode(msg);
        sock.send(data);
    }

    function genOnMessage (sock, env) {
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
                send(sock, {
                    type: 'response',
                    id: id,
                    result: result
                });
            }, function (err) {
                send(sock, {
                    type: 'response',
                    id: id,
                    error: {
                        message: error(err),
                        nisp: nisp
                    }
                });
            });
        };
    }

    function call (sock, nisp) {
        var id = genId();

        var callData = {
            type: 'request',
            id: id,
            nisp: nisp
        };

        return new Promise(function (resolve, reject) {
            send(sock, callData);

            rpcSessions[id] = function (data) {
                delete rpcSessions[id];

                if (data.error)
                    reject(new Error(JSON.stringify(data.error, 0, 4)));
                else
                    resolve(data.result);
            };
        });
    }

    function close (code, reason) {
        isAutoReconnect = false;
        if (isClient)
            client.close(code, reason);
        else
            server.close();
    }

    init();

    // If url is specified, init the client instance, else init the a server instance.
    if (isClient) {
        var connect = function () {
            try {
                if (isWebSocket) {
                    client = new Socket(url);
                } else {
                    client = new Socket(socketOptions);
                    client.connect(port, host);
                    normalizeSocket(client);
                }
            } catch (err) {
                if (isAutoReconnect) {
                    return setTimeout(connect, retrySpan);
                } else {
                    throw err;
                }
            }

            client.onopen = function () {
                while (sendQueue.length > 0) {
                    send(sendQueue.pop(), sendQueue.pop());
                }

                var onMessage = genOnMessage(client, onOpen(client));
                client.onmessage = function (e) {
                    return onMessage(e.data);
                };
            };
            client.onerror = init;
            client.onclose = function () {
                init();

                if (isAutoReconnect) {
                    setTimeout(connect, retrySpan);
                }
            };
        };

        connect();

        clientCall = function (nisp) {
            return call(client, nisp);
        };
    } else {
        if (isWebSocket) {
            if (httpServer) {
                server = new Server(extend(socketOptions, { server: httpServer }));
            } else {
                server = new Server(socketOptions);
            }
        } else {
            if (socketServer) {
                server = socketServer;
            } else {
                server = new Server(socketOptions);
                server.listen(port, host);
            }
        }

        server.on('connection', function (sock) {
            if (!filter(sock)) return;
            if (!isWebSocket) tcpFrame(sock);

            sock.on('message', genOnMessage(sock, onOpen(sock)));
        });

        server.on('error', init);
        server.on('close', init);

        clientCall = function (nisp, filter) {
            if (!filter) filter = function filter (cs) {
                return cs;
            };

            return Promise.all(filter(server.clients).map(function (sock) {
                return call(sock, nisp);
            }));
        };
    }

    return {
        sandbox: sandbox,
        close: close,
        server: server,
        client: client,
        call: clientCall
    };
};