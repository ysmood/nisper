var kit = require('nokit');

module.exports = (task) => {
    task('default', () => {
        kit.spawn('webpack', ['--watch']);

        kit.spawn('noe', [
            '-b', 'node',
            '-w', 'lib/**/*.js',
            '-w', 'test/**/*.js',

            '--',

            '--harmony',
            '--harmony_destructuring',
            '--harmony_default_parameters',

            'test/echo/server.js'
        ]);

    });
};

