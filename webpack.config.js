
var self = module.exports = {
    entry: {
        "test.echo.browser": "./test/echo/browser.js"
    },

    output: {
        filename: "[name].js",
        path: "./dist",
        pathinfo: true
    }
};
