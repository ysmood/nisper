import { Sandbox } from 'nisp'
import { Server } from 'http'
import * as WebSocket from 'ws'
import { extend } from './utils'

export type Options = {
    httpServer?: Server
    url?: string
    sandbox?: Sandbox,
    onOpen?: (ws: WebSocket) => any
    onRequest?: (req, res) => any
    filter?: (any) => boolean
    error?: (err) => any
    isAutoReconnect?: boolean
    binaryType?: 'arraybuffer'
    retrySpan?: number
    timeout?: number
    encode?:(data) => any
    decode?:(data) => any
    wsOptions?: WebSocket.IServerOptions
    isDebug?: boolean
}

export default (opts: Options) => {
    return extend({
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
    }, opts) as Options;
}
