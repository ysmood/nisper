
var nisper = require('../../lib');
var plain = require('nisp/fn/plain');

var client = nisper({
    url: `ws://127.0.0.1:8080`,
    sandbox: {
        echo: plain(([msg]) => msg)
    }
});

client.call(['echo', 'hey']).then(res => {
    console.log('server res:', res);

    client.close();
});
