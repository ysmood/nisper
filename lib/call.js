"use strict";
const index_1 = require("./index");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (url, nisp, opts) => {
    if (!opts)
        opts = {};
    opts.url = url;
    opts.isAutoReconnect = false;
    const client = index_1.default(opts);
    return client.call(nisp).then(res => {
        client.close();
        return res;
    });
};
