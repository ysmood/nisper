var nisper = require('../lib');

var kit = require('nokit');
var { flow, midToFlow } = kit.require('proxy');

var fn = require('nisp/fn/plainSpread');

var app = flow();

var rpc = nisper({
    httpServer: app.server,
    sandbox: {
        // Define a function, client can call it remotely.
        '+': fn((a, b) => a + b)
    }
});

app.push(midToFlow(rpc.middleware));

app.listen(8080);
