import kit from 'nokit';
const { flow, select } = kit.require('proxy');
import msgpack from 'msgpack-lite';
import {Server as WebsocketServer} from 'ws';

const app = flow();

const wss = new WebsocketServer({ server: app.server });

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
