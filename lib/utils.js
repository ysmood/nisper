module.exports = {
    genId: function () {
        return Math.floor(Math.random() * 100000000).toString(36);
    },

    extend: function (to, from) {
        var k;
        for (k in from) {
            to[k] = from[k];
        }
        return to;
    }

};