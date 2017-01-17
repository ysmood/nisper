import nisper from './index';

export default (url, nisp, opts?) => {
    if (!opts) opts = {};

    opts.url = url;
    opts.isAutoReconnect = false;

    const client = nisper(opts);

    return client.call(nisp).then(res => {
        client.close();

        return res;
    });
};
