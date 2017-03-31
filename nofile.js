var kit = require('nokit');

module.exports = (task) => {
    task("build", function () {
        return kit.spawn('tsc')
        .then(() => {
            return kit.spawn('webpack', [
                'browser.js', 'dist/nisper.js'
            ])
        })
        .then(() => {
            return kit.spawn('webpack', [
                '-p',
                'browser.js', 'dist/nisper.min.js'
            ])
        })
    });

    task('default dev', function () {
        return kit.spawn('tsc', ['-w'])
    })

    task('test', () => {
        return kit.spawn('junit', ['test/index.js']);
    });
};

