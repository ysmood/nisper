var kit = require('nokit');

module.exports = (task) => {
    task('default', () => {
    });

    task('lint', () => {
        kit.spawn('eslint', ['lib', 'test']);
    });

    task('test', () => {
        return kit.spawn('junit', ['test/index.js']);
    });
};

