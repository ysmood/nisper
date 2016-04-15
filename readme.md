Node version should greater than 4.0.0.

To run this file node should enable some harmony flags:

```bash
node --harmony --harmony_destructuring --harmony_default_parameters
```

# Example

Node Server:

```js
var nisper = require('nisper');
var plain = require('nisp/fn/plain');
var server = require('http').createServer(() => {});

var call = nisper({
    server,
    onOpen: () => {
        // boardcast to client
        call(['echo', 'hi']).then(res => {
            console.log('client res:', res);
        });

        return 'server';
    },
    sandbox: {
        echo: plain(([msg], env) => `${env} ${msg}`)
    }
});

server.listen(8080);

```


Browser:

```js
var nisper = require('nisper');
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

```
