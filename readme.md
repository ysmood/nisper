# Overview

Nisper is a RPC lib based on websocket protocol and [nisp][] language.

[![NPM version](https://badge.fury.io/js/nisper.svg)](http://badge.fury.io/js/nisper) [![Build Status](https://travis-ci.org/ysmood/nisper.svg)](https://travis-ci.org/ysmood/nisper) [![Deps Up to Date](https://david-dm.org/ysmood/nisper.svg?style=flat)](https://david-dm.org/ysmood/nisper)


# Features

- Script based call makes the functions composable, you can even write a complex program to remote
- Safe by design, full control of the user's authority
- Same api for both node to browser, browser to node and node to node
- Full support for Promise calls
- Supports binary data type (json by default)
- Bidirectional communication
- Auto reconnect

# Example

For more usage, read the unit test `test/index.js`.

### Echo Example

Node Server:

```js
var nisper = require('nisper');
var fn = require('nisp/fn/plainSpread');

var server = nisper({
    wsOption: { port: 8080 },
    sandbox: {
        // define a function, client can call it remotely.
        '+': fn((a, b) => a + b)
    },
    onOpen: () => {
        // when a client connected, boardcast to all clients.
        server.call(['-', 2, 1]).then(res => {
            console.log('client res:', res); // => [1]
        });
    }
});

```


Browser or node client:

```js
var nisper = require('nisper');
var fn = require('nisp/fn/plainSpread');

var client = nisper({
    url: `ws://127.0.0.1:8080`,
    sandbox: {
        // define a function, server can call it remotely.
        '-': fn((a, b) => a - b)
    }
});

           // add(1, add(1, 1))
client.call(['+', 1, ['+', 1, 1]]).then(res => {
    console.log('server res:', res); // => 3
});

```

# API

```js
nisper = ({
    // node native http.Server
    httpServer: null,

    // string, such as `ws://a.com`
    url: null,

    sandbox: {},

    onOpen: (connection) => env,

    filter: (connection) => Boolean,

    error: (err) => Error,

    isAutoReconnect: true,
    retrySpan: 1000,

    encode: (Object) => String || Buffer,
    decode: (String) => Object,

    wsOption: Object
}) => {
    sandbox: Object,
    close: Function,
    websocketClient: Object,
    webSocketServer: Object,
    call: Function
};
```

### call only once

```js
var call = require('nisper/lib/call');


call('ws://127.0.0.1:8080', ['echo', 'hi']).then(res => {
    console.log(res);
});
```

[nisp]: https://github.com/ysmood/nisp