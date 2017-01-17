import Promise from 'yaku';
declare var _default: (opts: any) => {
    sandbox: any;
    close: (code?: any, reason?: any) => void;
    websocketServer: any;
    websocketClient: any;
    middleware: (req: any, res: any) => Promise<void>;
    call: any;
    callx: any;
};
export default _default;
