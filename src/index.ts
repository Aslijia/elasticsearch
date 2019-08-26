import { Client, ConfigOptions } from "elasticsearch";


declare interface Configure {
    url: string
}

class BulkWriter {
    constructor() {

    }
}
export function configure(cfg: Configure) {
    console.log("初始化", cfg);
    const opts: ConfigOptions = {
        host: 'http://localhost:9200',
        keepAlive: true
    };
    const client = new Client(opts);
    return function (event: any) {
        console.log("elasticsearch logs:", event);
    }
}