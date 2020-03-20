import { Client, ConfigOptions } from "elasticsearch";
import { BulkWriter } from "./bulk_writer";

declare interface Configure {
    host: string,
    pipeline?: string,
    bulk?: number,
    waitForActiveShards?: string,
    interval?: number
}

let bulk: BulkWriter | undefined;

export function configure(cfg: Configure) {
    const opts: ConfigOptions = {
        host: cfg.host || 'http://localhost:9200',
        keepAlive: true
    };
    if (!bulk) {
        bulk = new BulkWriter(new Client(opts), {
            pipeline: cfg.pipeline,
            buffering: cfg.bulk ? true : false,
            bufferLimit: cfg.bulk,
            waitForActiveShards: cfg.waitForActiveShards,
            interval: cfg.interval
        });
        bulk.start();
    }
    /// event
    /// startTime: 2020-03-20T03:23:31.249Z,
    /// categoryName: 'els-test',
    /// data: [ '\u001b[36m\u001b[39mauthorize', { type: 'sms', data: [Object] } ],
    /// level: Level { level: 10000, levelStr: 'DEBUG', colour: 'cyan' },
    /// context: {},
    /// pid: 9296
    return function (event: any) {
        if (event.data.length > 1) {
            const body = typeof event.data[1] === 'object' ? event.data[1] : {};
            body.title = event.data[0];
            body.timestamp = event.startTime;
            if (bulk) {
                bulk.append(`${event.categoryName}.${body.title}`, event.level.levelStr, body);
            }
        }
    }
}