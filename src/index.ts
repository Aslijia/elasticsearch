import { Client, ClientOptions } from "@elastic/elasticsearch";
import { isObject, isUndefined } from "util";

let bulk: Client;

export function configure(cfg: ClientOptions) {
    if (!bulk) {
        bulk = new Client(cfg);
    }

    return function (event: any) {
        const message = event.data[0];
        const context = event.data[1] || {};
        for (let i in context) {
            context[i] = isObject(context[i]) ? JSON.stringify(context[i]) : isUndefined(context[i]) ? 'undefined' : context[i];
        }

        bulk.index({
            index: event.categoryName,
            type: 'log4js',
            body: {
                time: event.startTime,
                category: event.categoryName,
                level: event.level.levelStr.toLocaleLowerCase(),
                message,
                context,
                trace: {
                    filename: event.data[2] || 'unknown',
                    function: event.data[3] || 'unknown',
                    line: event.data[4] || -1
                },
                pid: event.pid
            }
        }).catch(err => {
            console.error('lo4js append logger to elasticsearch failed', { event, message: err.message });
        });
    }
}