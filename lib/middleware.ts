import Nisp from 'nisp'
import Promise from 'yaku'
import { ServerRequest, ServerResponse } from 'http'
import { Options } from './options'

export default (opts: Options) => {
    var Buffer = global['Buffer']

    return (req: ServerRequest, res: ServerResponse) => {
        return Promise.all([
            opts.onRequest(req, res),
            new Promise((resolve, reject) => {
                let buf = new Buffer(0);
                req.on('data', chunk => {
                    buf = Buffer.concat([buf, chunk as Buffer]);
                });
                req.on('error', reject);
                req.on('end', () => {
                    resolve(buf);
                });
            })
        ]).then(ret => {
            const env = ret[0];
            const nisp = opts.decode(ret[1]);

            return Nisp(nisp, opts.sandbox, env);
        }).then(result => {
            res.end(opts.encode({
                result
            }));
        }, err => {
            res.end(opts.encode({
                error: {
                    message: opts.error(err)
                }
            }));
        });
    }
}
