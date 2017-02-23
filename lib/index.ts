import Nisp from 'nisp';
import nispEncode from 'nisp/lib/encode'
import Promise from 'yaku';
import * as ErrorCodes from 'ws/lib/ErrorCodes'
import options, { Options } from './options'
import { extend, genId } from './utils'
import { Sandbox } from 'nisp'
import * as WebSocket from '../types/ws'
import middleware from './middleware'
import { ServerRequest, ServerResponse } from 'http'

export { Sandbox, ServerRequest, ServerResponse }

export default function (opts: Options) {
    opts = options(opts)

    let clientCall;
    let clientCallx;
    let wsServer: WebSocket.Server;
    let wsClient: WebSocket;
    const sessions = {};
    const isClient = typeof opts.url === 'string';
    const sendQueue = [];

    function send (ws, msg) {
        if (ws.readyState === 1) {
            const data = opts.encode(msg);
            ws.send(data);
        } else {
            sendQueue.push(msg);
        }
    }

    function genOnMessage (ws, env) {
        return msg => {
            const data = opts.decode(msg);
            const type = data.type;
            const id = data.id;
            const nisp = data.nisp;

            if (type === 'response') {
                sessionDone(id, data);
                return;
            }

            return Promise.resolve(env).then(env => {
                return Nisp(nisp, opts.sandbox, env);
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
                        message: opts.error(err)
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
            if (opts.isDebug) {
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

        if (opts.isDebug)
            var error = new Error();

        return new Promise((resolve, reject) => {
            send(ws, callData);

            sessions[id] = {
                resolve,
                reject,
                timer: setTimeout(deleteRpcSession, opts.timeout, id, reject)
            };

            if (opts.isDebug)
                sessions[id].error = error;
        });
    }

    function wsError (code: number, reason: string) {
        opts.isAutoReconnect = false;
        sendQueue.length = 0;
        const ids = [];
        for (let id in sessions) {
            ids.push(id);
        }
        ids.forEach(id => {
            sessionDone(id, { error: {
                code,
                message: reason
            } });
        });
    }

    function close (code?: number, reason?: string) {
        opts.isAutoReconnect = false
        clearTimeout(reconnectTimer)

        wsError(code, reason)

        if (isClient)
            wsClient.close(code, reason);
        else
            wsServer.close();
    }

    // If url is specified, init the client instance, else init the a server instance.
    let reconnectTimer
    if (isClient) {
        const connect = () => {
            try {
                wsClient = new WebSocket(opts.url);
            } catch (err) {
                if (opts.isAutoReconnect) {
                    return reconnectTimer = setTimeout(connect, opts.retrySpan);
                } else {
                    throw err;
                }
            }

            wsClient.onopen = () => {
                // clear pending queue
                // we must clone it to prevent the infinite loop when readyState is not 1
                let queue = sendQueue.concat()
                sendQueue.length = 0
                for (let msg of queue) {
                    send(wsClient, msg)
                }

                wsClient.binaryType = opts.binaryType;

                const onMessage = genOnMessage(wsClient, opts.onOpen(wsClient));
                wsClient.onmessage = e => onMessage(
                    // eslint-disable-next-line
                    e.data instanceof ArrayBuffer ? new Uint8Array(e.data) : e.data
                );
            };

            let onClose = (e) => {
                wsError(e.code, 'websocket error: ' + ErrorCodes[e.code])

                if (opts.isAutoReconnect) {
                    reconnectTimer = setTimeout(connect, opts.retrySpan);
                }
            };
            wsClient.onerror = onClose
            wsClient.onclose = onClose
        };

        connect();

        clientCall = (nisp) => call(wsClient, nisp);
        clientCallx = function (...args) {
            const nisp = (nispEncode as any)(...args);
            return clientCall(nisp, true);
        };
    } else {
        if (opts.httpServer) {
            wsServer = new WebSocket.Server(extend(opts.wsOptions, { server: opts.httpServer }));
        } else {
            wsServer = new WebSocket.Server(opts.wsOptions);
        }

        wsServer.on('connection', ws => {
            if (!opts.filter(ws)) return;
            ws.binaryType = opts.binaryType;
            ws.on('message', genOnMessage(ws, opts.onOpen(ws)));
        });

        clientCall = call;
        clientCallx = ws => function (...args) {
            const nisp = (nispEncode as any)(...args)
            return clientCall(ws, nisp);
        };
    }

    return {
        sandbox: opts.sandbox,
        close,
        websocketServer: wsServer,
        websocketClient: wsClient,
        middleware: middleware(opts),
        call: clientCall,
        callx: clientCallx
    };
};