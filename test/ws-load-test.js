const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8888 });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    ws.send(message)
  });
});

var client = new WebSocket("ws://127.0.0.1:8888")

var total = 100000

client.onopen = () => {
    for (let i = 0; i < total; i++) {
        client.send("ok")
    }
}

let count = 0
client.onmessage = (msg) => {
    ret = msg.data + ++count
    if (count === total) {
        console.log('done')
        wss.close()
    }
}