import { Client, ClientOptions } from "@elastic/elasticsearch";
import { isObject, isUndefined, isArray, isNull, isNumber } from "util";

let client: Client;

function resolve(o: any) {
    for (let i in o) {
        if (isObject(o[i])) {
            o[i] = resolve(o[i]);
        } else if (isUndefined(o[i]) || isNull(o[i])) {
            delete o[i];
        }
    }
    return o;
}

export function configure(cfg: ClientOptions) {
    if (!client) {
        client = new Client(cfg);
    }

    return function (event: any) {
        const message = event.data[0];
        const context = resolve(isObject(event.data[1]) ? event.data[1] : {});

        client.index({
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