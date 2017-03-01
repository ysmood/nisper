var nisper = require('../lib');

var kit = require('nokit');
var ws = require('ws')
var WebsocketServer = ws.Server;

var wss = new WebsocketServer({
    maxPayload: 2,
    port: 8080
});

wss.on('connection', (ws) => {
    ws.onmessage = (e) => {
        console.log(e.data)
    }
    ws.onerror = (e) => console.log('###', e.message)
});


var c = new ws('ws://127.0.0.1:8080')

c.onclose = (e) => {
    console.log('*****', e.code)
}

setTimeout(() => {
    c.send('1234567890')
}, 1000)

