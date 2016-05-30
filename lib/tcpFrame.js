// The max packet size of normal TCP is only 64KB.
// This protocol is built on TCP and has the maximum message packet capability of 4GB.
//
// Protocol:
//
// Each TCP packet will be a format like below:
//
// ----------------------------------------
// |                TCP packet            |
// ----------------------------------------
// | head (0 or 4B) |  body (0 ~ 65532B)  |
// ----------------------------------------
//
// Here "65532B = 64KB - 4B"
//
// An Example of 128KB trasportation:
//
// | head (0B128) | 65532B body | 64kB body | 4B body |

var weightList = [
    Math.pow(2, 0),
    Math.pow(2, 8),
    Math.pow(2, 16),
    Math.pow(2, 24)
];

var headerSize = 4;

function getLen (buf) {
    var i, len;
    i = 0;
    len = 0;
    while (i < headerSize) {
        len += buf[i] * weightList[i];
        i++;
    }
    return len;
}

function genSizeBuf (len) {
    var digit, i, sizeBuf;
    sizeBuf = new Buffer(headerSize);
    digit = 0;
    i = 0;
    while (i < headerSize) {
        if (len > 0) {
            digit = len % 256;
            len = (len - digit) / 256;
            sizeBuf[i] = digit;
        } else {
            sizeBuf[i] = 0;
        }
        i++;
    }
    return sizeBuf;
}

function send (data) {
    var sizeBuf = genSizeBuf(data.length);
    this.write(Buffer.concat([sizeBuf, data]));
}

module.exports = function (sock) {
    sock.send = send;

    var buf = new Buffer(0);

    // cases
    // [x x 0 0 0 0 | x x 0 0 0]
    // [ | x x 0 0 0 0 x x 0 0 0]
    // [x x 0 0 | 0 0 x x 0 0 0]
    // [x x 0 0 0 0 x | x 0 0 0]
    // [x x 0 0 0 0 x x 0 0 0]
    function frameEvent (chunk) {
        var len;

        buf = Buffer.concat([buf, chunk]);

        while (buf.length >= headerSize) {
            len = getLen(buf);
            if (buf.length >= len + headerSize) {
                buf = buf.slice(headerSize);

                sock.emit('message', buf.slice(0, len));

                buf = buf.slice(len);
            } else {
                return;
            }
        }
    }

    sock.on('data', frameEvent);
};