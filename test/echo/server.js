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
