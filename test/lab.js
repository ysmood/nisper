var nisper = require('../lib');

var kit = require('nokit');
var { flow, midToFlow, select } = kit.require('proxy');
var msgpack = require('msgpack-lite');
var WebsocketServer = require('ws').Server;

var fn = require('nisp/fn/plainSpread');

var app = flow();

var wss = new WebsocketServer({ server: app.server });

wss.on('connection', (ws) => {
    ws.binaryType = 'arraybuffer';
    ws.send(
        msgpack.encode({a: 1, b: new Buffer([1,2,3])})
    );

    ws.on('message', (d) => {
        kit.logs(msgpack.decode(d));
    });
});

app.push(select('/js', ctx => ctx.body = kit.readFile(kit.path.join(__dirname, './a.js'))));

app.push(select('/', ctx => {
    ctx.body = `
        <html>
            <script src='/js'></script>
        </html>
    `;
}));

app.listen(8000);
