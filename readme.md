Node version should greater than 4.0.0.

To run this file node should enable some harmony flags:

```bash
node --harmony --harmony_destructuring --harmony_default_parameters
```

# Features

- Script based call makes the functions composable, you can even write a complex program to remote
- Safe by design, full control of the user's authority
- Same api for both node to browser, browser to node and node to node
- Bidirectional communication
- Auto reconnect & auto retry

# Example

### Echo Example

Node Server:

```js
var nisper = require('nisper');
var plain = require('nisp/fn/plain');
var server = require('http').createServer(() => {});

var client = nisper({
    server,
    sandbox: {
        // define a echo function, client can call it remotely.
        echo: plain(([msg]) => msg)
    },
    onOpen: () => {
        // when a client connected, boardcast to all clients.
        client.call(['echo', 'hi']).then(res => {
            console.log('client res:', res);
        });
    }
});

server.listen(8080);

```


Browser or node client:

```js
var nisper = require('nisper');
var plain = require('nisp/fn/plain');

var client = nisper({
    url: `ws://${location.host}`,
    sandbox: {
        // define a echo function, server can call it remotely.
        echo: plain(([msg]) => msg)
    }
});

client.call(['echo', 'hey']).then(res => {
    console.log('server res:', res);
});

```
