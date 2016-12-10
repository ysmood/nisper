var kit = require('nokit');

module.exports = (task) => {
    task('default', () => {
    });

    task('lint', () => {
        return kit.spawn('eslint', ['lib', 'test']);
    });

    task('test', () => {
        return kit.spawn('junit', ['test/index.js']);
    });
};

