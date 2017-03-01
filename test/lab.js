var nisper = require('../lib').default;

var kit = require('nokit');
var ws = require('ws')
var WebsocketServer = ws.Server;

var server = nisper({
    wsOptions: {
        port: 8080,
        maxPayload: 3
    }
})

var c = nisper({
    url: 'ws://127.0.0.1:8080',
})

setTimeout(() => {
    c.call(['asdlkfjasldfjslkfjlsjdflksj']).catch((err) => {
        console.log(err.message)
    })
}, 1000)