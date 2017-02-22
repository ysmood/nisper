try {
    module.exports = typeof WebSocket === 'undefined' ? eval('require')('ws') : WebSocket
} catch (err) {
}