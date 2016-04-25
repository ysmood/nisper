var nisper = require('./index');

module.exports = function (url, nisp, opts) {
    if (!opts) opts = {};

    opts.url = url;
    opts.isAutoReconnect = false;

    var client = nisper(opts);

    return client.call(nisp).then(function (res) {
        client.close();

        return res;
    });
};
