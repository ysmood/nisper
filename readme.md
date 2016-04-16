# Overview

Nisper is a RPC lib based on websocket protocol and nisp language.

[![NPM version](https://badge.fury.io/js/nisper.svg)](http://badge.fury.io/js/nisper) [![Build Status](https://travis-ci.org/ysmood/nisper.svg)](https://travis-ci.org/ysmood/nisper) [![Deps Up to Date](https://david-dm.org/ysmood/nisper.svg?style=flat)](https://david-dm.org/ysmood/nisper)


# Features

- Script based call makes the functions composable, you can even write a complex program to remote
- Safe by design, full control of the user's authority
- Same api for both node to browser, browser to node and node to node
- Bidirectional communication
- Auto reconnect

# Example

### Echo Example

Node Server:

```js
var nisper = require('nisper');
var fn = require('nisp/fn/plainSpread');
var httpServer = require('http').createServer(() => {});

var server = nisper({
    httpServer: httpServer,
    sandbox: {
        // define a echo function, client can call it remotely.
        echo: fn((msg) => msg)
    },
    onOpen: () => {
        // when a client connected, boardcast to all clients.
        server.call(['echo', 'hi']).then(res => {
            console.log('client res:', res);
        });
    }
});

httpServer.listen(8080);

```


Browser or node client:

```js
var nisper = require('nisper');
var fn = require('nisp/fn/plainSpread');

var client = nisper({
    url: `ws://127.0.0.1:8080`,
    sandbox: {
        // define a echo function, server can call it remotely.
        echo: fn((msg) => msg)
    }
});

client.call(['echo', 'hey']).then(res => {
    console.log('server res:', res);
});

```

# API

```js
nisper = ({
    httpServer: null,
    url: null,
    sandbox: {},
    onOpen: (connection) => env,
    filter: (connection) => Boolean,
    isAutoReconnect: true,
    retrySpan: 1000,
    encode: (Object) => String,
    decode: (String) => Object,
    wsOption: Object
}) => {
    sandbox: Object,
    close: Function,
    websocketClient: Object,
    WebSocketServer: Object,
    call: Function
};
```
