var nisper = require('../../lib');
var plain = require('nisp/fn/plain');
var fs = require('fs');

var server = require('http').createServer((req, res) => {
    res.end(`
        <html>
            <script>${fs.readFileSync('dist/test.echo.browser.js', 'utf8')}</script>
        </html>
    `);
});

var client = nisper({
    server,
    sandbox: {
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
