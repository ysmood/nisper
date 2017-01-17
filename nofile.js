var kit = require('nokit');

module.exports = (task) => {
    task("build", function () {
        return kit.spawn('tsc')
    });

    task('default dev', function () {
        return kit.spawn('tsc', ['-w'])
    })

    task('test', () => {
        return kit.spawn('junit', ['test/index.js']);
    });
};

