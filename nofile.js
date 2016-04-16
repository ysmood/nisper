var kit = require('nokit');

module.exports = (task) => {
    task('default', () => {
        kit.spawn('webpack', ['--watch']);

        kit.spawn('noe', [
            '-b', 'node',
            '-w', 'lib/**/*.js',
            '-w', 'test/**/*.js',

            '--',

            'test/echo/server.js'
        ]);

    });

    task('lint', () => {
        kit.spawn('eslint', ['lib', 'test']);
    });

    task('test', () => {
        return kit.spawn('junit', ['test/index.js']);
    });
};

