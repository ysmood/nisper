
import Nisp from 'nisp';
import nispEncode from 'nisp/lib/encode'
import Promise from 'yaku';

function genId () {
    return Math.floor(Math.random() * 100000000).toString(36);
}

function extend (to, from) {
    let k;
    for (k in from) {
        to[k] = from[k];
    }
    return to;
}

export default function (opts: {
    httpServer?: any
    url?: string
    sandbox?: {},
    onOpen?: (ws) => any
    onRequest?: (req, res) => any 
    filter?: (any) => boolean
    error?: (err) => any
    isAutoReconnect?: boolean
    binaryType?: 'arraybuffer'
    retrySpan?: number
    timeout?: number
    encode?:(data) => any
    decode?:(data) => any
    wsOptions?: {}
    isDebug?: boolean
}) {
    opts = extend({
        httpServer: null,
        url: null,
        sandbox: {},
        onOpen(ws) {
            return ws;
        },
        onRequest(req) {
            return req;
        },
        filter() {
            return true;
        },
        error(err) {
            return err instanceof Error ? err.stack.split('\n') : err;
        },
        isAutoReconnect: true,
        binaryType: 'arraybuffer',
        retrySpan: 1000,
        timeout: 1000 * 60 * 2, // 2 minutes
        encode(data) {
            return JSON.stringify(data, null, 4);
        },
        decode(data) {
            return JSON.parse(`${data}`);
        },
        wsOptions: {},
        isDebug: false
    }, opts);

    const httpServer = opts.httpServer;
    const url = opts.url;
    const sandbox = opts.sandbox;
    const onOpen = opts.onOpen;
    const onRequest = opts.onRequest;
    const filter = opts.filter;
    const error = opts.error;
    let isAutoReconnect = opts.isAutoReconnect;
    const retrySpan = opts.retrySpan;
    const timeout = opts.timeout;
    const encode = opts.encode;
    const decode = opts.decode;
    const wsOptions = opts.wsOptions;
    const isDebug = opts.isDebug;

    const WS = typeof WebSocket === 'undefined' ? eval('require')('ws') : WebSocket;
    let clientCall;
    let clientCallx;
    let wsServer;
    let wsClient;
    const sessions = {};
    const isClient = typeof url === 'string';
    const sendQueue = [];

    function send (ws, msg) {
        if (ws.readyState === 1) {
            const data = encode(msg);
            ws.send(data);
        } else {
            sendQueue.push(msg);
        }
    }

    function genOnMessage (ws, env) {
        return msg => {
            const data = decode(msg);
            const type = data.type;
            const id = data.id;
            const nisp = data.nisp;

            if (type === 'response') {
                sessionDone(id, data);
                return;
            }

            return Promise.resolve(env).then(env => {
                return Nisp(nisp, sandbox, env);
            }).then(result => {
                send(ws, {
                    type: 'response',
                    id,
                    result
                });
            }).catch(err => {
                send(ws, {
                    type: 'response',
                    id,
                    error: {
                        message: error(err)
                    }
                });
            });
        };
    }

    function deleteRpcSession (id, reject?) {
        const session = sessions[id];

        if (!session) return;

        clearTimeout(session.timer);
        delete sessions[id];

        if (reject)
            reject(new Error('timeout'));
    }

    function sessionDone (id, data) {
        const session = sessions[id];

        if (!session) return;

        if (data.error) {
            if (isDebug) {
                session.error.message = JSON.stringify(data.error, null, 4);
                session.reject(session.error);
            } else {
                session.reject(new Error(JSON.stringify(data.error, null, 4)));
            }
        } else {
            session.resolve(data.result);
        }

        deleteRpcSession(id);
    }

    function call (ws, nisp) {
        const id = genId();

        const callData = {
            type: 'request',
            id,
            nisp
        };

        if (isDebug)
            var error = new Error();

        return new Promise((resolve, reject) => {
            send(ws, callData);

            sessions[id] = {
                resolve,
                reject,
                timer: setTimeout(deleteRpcSession, timeout, id, reject)
            };

            if (isDebug)
                sessions[id].error = error;
        });
    }

    function close (code?, reason?) {
        isAutoReconnect = false;

        sendQueue.length = 0;

        const ids = [];
        for (const id in sessions) {
            ids.push(id);
        }
        ids.forEach(id => {
            sessionDone(id, { error: { message: 'client closed' } });
        });

        if (isClient)
            wsClient.close(code, reason);
        else
            wsServer.close();
    }

    // If url is specified, init the client instance, else init the a server instance.
    if (isClient) {
        const connect = () => {
            try {
                wsClient = new WS(url);
            } catch (err) {
                if (isAutoReconnect) {
                    return setTimeout(connect, retrySpan);
                } else {
                    throw err;
                }
            }

            wsClient.onopen = () => {
                while (sendQueue.length > 0) {
                    send(wsClient, sendQueue.pop());
                }

                wsClient.binaryType = opts.binaryType;

                const onMessage = genOnMessage(wsClient, onOpen(wsClient));
                wsClient.onmessage = e => onMessage(
                    // eslint-disable-next-line
                    e.data instanceof ArrayBuffer ? new Uint8Array(e.data) : e.data
                );
            };
            wsClient.onclose = () => {
                if (isAutoReconnect) {
                    setTimeout(connect, retrySpan);
                }
            };
        };

        connect();

        clientCall = (nisp) => call(wsClient, nisp);
        clientCallx = function (...args) {
            const nisp = (nispEncode as any)(...args);
            return clientCall(nisp, true);
        };
    } else {
        if (httpServer) {
            wsServer = new WS.Server(extend(wsOptions, { server: httpServer }));
        } else {
            wsServer = new WS.Server(wsOptions);
        }

        wsServer.on('connection', ws => {
            if (!filter(ws)) return;
            ws.binaryType = opts.binaryType;
            ws.on('message', genOnMessage(ws, onOpen(ws)));
        });

        clientCall = call;
        clientCallx = ws => function (...args) {
            const nisp = (nispEncode as any)(...args)
            return clientCall(ws, nisp);
        };
    }

    function middleware (req, res) {
        return Promise.all([
            onRequest(req, res),
            new Promise((resolve, reject) => {
                let buf = new Buffer(0);
                req.on('data', chunk => {
                    buf = Buffer.concat([buf, chunk]);
                });
                req.on('error', reject);
                req.on('end', () => {
                    resolve(buf);
                });
            })
        ]).then(ret => {
            const env = ret[0];
            const nisp = decode(ret[1]);

            return Nisp(nisp, sandbox, env);
        }).then(result => {
            res.end(encode({
                result
            }));
        }, err => {
            res.end(encode({
                error: {
                    message: error(err)
                }
            }));
        });
    }

    return {
        sandbox,
        close,
        websocketServer: wsServer,
        websocketClient: wsClient,
        middleware,
        call: clientCall,
        callx: clientCallx
    };
};