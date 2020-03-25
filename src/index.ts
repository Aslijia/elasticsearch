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
    /// data: [ 'authorize', { type: 'sms', data: [Object] } ],
    /// level: Level { level: 10000, levelStr: 'DEBUG', colour: 'cyan' },
    /// context: {},
    /// pid: 9296
    return function (event: any) {
        const index = event.data[2];
        if (index && typeof index === 'string') {
            if (bulk) {
                bulk.append(index, event.level.levelStr, {
                    category: event.categoryName,
                    time: event.startTime,
                    message: event.data[0],
                    context: event.data[1]
                });
            }
        }
    }
}