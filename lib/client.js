var utils = require('./utils');
var tcpFrame = require('./tcpFrame');
var Promise = require('yaku');
var Nisp = require('nisp');

var self = module.exports = function (opts) {
    this.opts = utils.extend({
        url: null,
        filter: function () {
            return true;
        },
        isAutoReconnect: true,
        retrySpan: 1000,
        sandbox: {}
    }, opts);
};

utils.extend(self.prototype, {
    send: function () {
    },

    onmessage: function () {},

    onopen: function () {},

    onerror: function () {
    },

    onclose: function () {
    }
});
