var nisper = require('../lib').default;
var $ = require('nisp/lib/$').default;

var kit = require('nokit');

var port = 8293

var server = nisper({
    wsOptions: {
        port: port
    },
    sandbox: {
        echo: msg => msg,
        $: $
    }
})

var client = nisper({
    url: `ws://127.0.0.1:${port}`
})

let ret = []
let count = 0
for (let i = 0; i < 100000; i++) {
    ret.push(client.callx`(echo ${i})`.then((msg) => {
        console.log(msg, count++)
    }))
}

Promise.all(ret).then(() => {
    console.log('done')
}).catch((err) => {
    console.error(err)
})