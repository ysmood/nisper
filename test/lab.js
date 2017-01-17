"use strict";
const nokit_1 = require("nokit");
const { flow, select } = nokit_1.default.require('proxy');
const msgpack_lite_1 = require("msgpack-lite");
const ws_1 = require("ws");
const app = flow();
const wss = new ws_1.Server({ server: app.server });
wss.on('connection', (ws) => {
    ws.binaryType = 'arraybuffer';
    ws.send(msgpack_lite_1.default.encode({ a: 1, b: new Buffer([1, 2, 3]) }));
    ws.on('message', (d) => {
        nokit_1.default.logs(msgpack_lite_1.default.decode(d));
    });
});
app.push(select('/js', ctx => ctx.body = nokit_1.default.readFile(nokit_1.default.path.join(__dirname, './a.js'))));
app.push(select('/', ctx => {
    ctx.body = `
        <html>
            <script src='/js'></script>
        </html>
    `;
}));
app.listen(8000);
