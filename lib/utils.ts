export function extend (to, from) {
    let k;
    for (k in from) {
        to[k] = from[k];
    }
    return to;
}

export function genId () {
    return Math.floor(Math.random() * 100000000).toString(36);
}
