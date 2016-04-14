// To run this file node should enable:
// '--harmony'
// '--harmony_destructuring'
// '--harmony_default_parameters'

var Nisp = require('nisp');
var Promise = require('yaku');

class NisperError extends Error {
    constructor (msg, details) {
        super(msg);

        this.details = details;
    }
}

module.exports = ({
    sandbox,
    server,
    url,
    onConnection = (ws) => {
        return true;
    },
    reconnectSpan = 1000,
    timeout = 5000,
    onError = (err, nisp) => {
        console.error(err.stack, encode(nisp)); // eslint-disable-line
    },
    encode = (data) => {
        return JSON.stringify(data, 0, 4);
    },
    decode = (data) => {
        return JSON.parse(data, 0, 4);
    }
}) => {

    var rpcPool = {};

    function genId () {
        return Math.random().toString().slice(2);
    }

    function send (ws, msg) {
        // connecting
        if (ws.readState === 0) {
            return setTimeout(send, 100, ws, msg);
        }

        ws.send(encode(msg));
    }

    var genOnMessage = (ws) => (msg) => {
        var data = decode(msg);
        var { type, id, nisp } = data;

        if (type === 'response') {
            if (rpcPool[id])
                rpcPool[id](data);
            return;
        }

        Nisp(nisp, sandbox).then(function (result) {
            send(ws, {
                type: 'response',
                id,
                result
            });
        }, function (err) {
            onError(err, nisp);

            send(ws, {
                type: 'response',
                id,
                error: {
                    id,
                    code: err.code,
                    message: err.message,
                    nisp: nisp
                }
            });
        });
    };

    var call = (ws, nisp) => {
        var id = genId();

        var callData = {
            type: 'request',
            id,
            nisp
        };

        send(ws, callData);

        return new Promise((resolve, reject) => {
            var tmr = setTimeout(() => {
                delete rpcPool[id];
                reject(new NisperError('rpc timeout', callData));
            }, timeout);

            rpcPool[id] = (data) => {
                clearTimeout(tmr);
                delete rpcPool[id];

                if (data.error)
                    reject(new NisperError(
                        data.error.message,
                        data.error
                    ));
                else
                    resolve(data.result);
            };
        });
    };

    if (typeof WebSocket !== 'function') {
        WebSocket = require('ws');
    }

    if (server) {
        var wsServer = new WebSocket.Server({ server });

        wsServer.on('connection', (ws) => {
            if (!onConnection(wsServer, ws))
                return;

            ws.on('message', genOnMessage(ws));
        });

        return (nisp, filter = cs => cs) => {
            Promise.all(
                filter(wsServer.clients).map(ws => call(ws, nisp))
            );
        };
    } else {
        var ws;

        var connect = () => {
            ws = new WebSocket(url);
            ws.onmessage = ({ data }) => genOnMessage(ws)(data);
            ws.onclose = () => {
                if (reconnectSpan !== 0) {
                    setTimeout(connect, reconnectSpan);
                }
            };
        };

        connect();

        return (nisp) => call(ws, nisp);
    }
};

module.exports.NisperError = NisperError;
