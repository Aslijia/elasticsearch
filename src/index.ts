import { Client, ConfigOptions } from "elasticsearch";
import { BulkWriter } from "./bulk_writer";


declare interface Configure {
    host: string
}

export function configure(cfg: Configure) {
    const opts: ConfigOptions = {
        host: cfg.host || 'http://localhost:9200',
        keepAlive: true
    };
    const bulk = new BulkWriter(new Client(opts), {});
    bulk.start();

    return function (event: any) {
        const body = event.data[1] ? event.data[1] : {};
        body.message = event.data[0];
        bulk.append(event.categoryName, 'doc', {
            level: event.level.levelStr, category: event.categoryName, timestamp: Date.now(), body
        });
    }
}