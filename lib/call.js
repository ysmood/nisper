"use strict";
var index_1 = require("./index");
exports.__esModule = true;
exports["default"] = function (url, nisp, opts) {
    if (!opts)
        opts = {};
    opts.url = url;
    opts.isAutoReconnect = false;
    var client = index_1["default"](opts);
    return client.call(nisp).then(function (res) {
        client.close();
        return res;
    });
};
