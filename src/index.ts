import { Client, ConfigOptions } from "elasticsearch";
import { BulkWriter } from "./bulk_writer";


declare interface Configure {
    host: string,
    pipeline?: string,
    bulk?: number,
    waitForActiveShards?: string,
    interval?: number
}

export function configure(cfg: Configure) {
    const opts: ConfigOptions = {
        host: cfg.host || 'http://localhost:9200',
        keepAlive: true
    };
    const bulk = new BulkWriter(new Client(opts), {
        pipeline: cfg.pipeline,
        buffering: cfg.bulk ? true : false,
        bufferLimit: cfg.bulk,
        waitForActiveShards: cfg.waitForActiveShards,
        interval: cfg.interval
    });
    bulk.start();

    return function (event: any) {
        const body = event.data[1] ? event.data[1] : {};
        body.message = event.data[0];
        bulk.append(event.categoryName, 'doc', {
            level: event.level.levelStr, category: event.categoryName, timestamp: Date.now(), body
        });
    }
}