var nisper = require('../lib').default;

var kit = require('nokit');
var ws = require('ws')
var WebsocketServer = ws.Server;

setTimeout(() => {
    var server = nisper({
        wsOptions: {
            port: 8080
        },
        sandbox: {
            echo (s) {
                return s
            }
        }
    })
}, 3000)

var c = nisper({
    url: 'ws://127.0.0.1:8080',
    retrySpan: 100,
    onOpen () {
    },
})

c.call(['echo', 'ok']).then((v) => {
    console.log(v)
})