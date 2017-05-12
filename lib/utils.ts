export function extend (to, from) {
    let k;
    for (k in from) {
        to[k] = from[k];
    }
    return to;
}

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(36).substring(1)
}
export function genId (): string {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}

