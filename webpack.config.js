
var self = module.exports = {
    entry: {
        "test.echo.client": "./test/echo/client.js"
    },

    output: {
        filename: "[name].js",
        path: "./dist",
        pathinfo: true
    }
};
