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

Live Demo: https://runkit.com/ysmood/nisper2

### Echo Example

Node Server:

```js
import nisper from 'nisper';
import $ from 'nisp/lib/$';

const server = nisper({
    wsOptions: { port: 8080 },
    sandbox: {
        $,
        // Define a function, client can call it remotely.
        '+': (a, b) => a + b
    },
    onOpen: (ws) => {
        // When a client connected, call it
        server.call(ws, ['-', 2, 1]).then(res => {
            console.log('client res:', res); // => 1
        });
    }
});

```

Browser or node client:

```js
import nisper from 'nisper';

const client = nisper({
    url: `ws://127.0.0.1:8080`,
    sandbox: {
        // Define a function, server can call it remotely.
        '-': (a, b) => a - b
    }
});

// add(1, add(1, 1))
client.callx`(+ 1 (+ 1 1))`.then(res => {
    console.log('server res:', res); // => 3
});

```


### Composable async function & msgpack


```js
import nisper from 'nisper';
import async from 'nisp/lib/async';
import msgpack from 'msgpack-lite';

const server = nisper({
    wsOptions: { port: 8080 },
    encode: msgpack.encode,
    decode: msgpack.decode,
    sandbox: {
        // Define a function, client can call it remotely.
        // This add function will return the sum after 1 second.
        '+': async((a, b) =>
            new Promise(resolve =>
                setTimeout(resolve, 1000, a + b)
            )
        )
    }
});
```

Browser or node client:

```js
import nisper from 'nisper';
import msgpack from 'msgpack-lite';

const client = nisper({
    url: `ws://127.0.0.1:8080`,
    encode: msgpack.encode,
    decode: msgpack.decode
});

// add(1, add(1, 1))
client.call(['+', 1, ['+', 1, 1]]).then(res => {
    // It will log 3 after 2 second.
    console.log('server res:', res);
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

    onRequest: () => env,

    filter: (connection) => Boolean,

    error: (err) => Error,

    isAutoReconnect: true,
    retrySpan: 1000,
    timeout: 1000 * 60 * 2,

    encode: (Object) => String || Buffer,
    decode: (String) => Object,

    // Same options as ws: https://github.com/websockets/ws/blob/master/doc/ws.md
    wsOptions: Object,

    isDebug: false
}) => {
    sandbox: Object,
    close: Function,
    websocketClient: Object,
    websocketServer: Object,
    middleware: Function,
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
