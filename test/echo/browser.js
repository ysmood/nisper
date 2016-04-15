
var nisper = require('../../lib');
var plain = require('nisp/fn/plain');

var call = nisper({
    url: `ws://${location.host}`,
    onOpen: () => 'client',
    sandbox: {
        echo: plain(([msg], env) => `${env} ${msg}`)
    }
});

call(['echo', 'hey']).then(res => {
    console.log('server res:', res);
});

