var nisper = require('../lib').default;

var kit = require('nokit');
var ws = require('ws')
var WebsocketServer = ws.Server;

var server = nisper({
    wsOptions: {
        port: 8080
    },
})

server.close().then(() => {
    server = nisper({
        wsOptions: {
            port: 8080
        },
        sandbox: {
            echo () { return 'ok' }
        }
    })

    var c = nisper({
        url: 'ws://127.0.0.1:8080'
    })

    c.call(['echo']).then((v) => {
        console.log(v)
    })
})
