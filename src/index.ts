import { Client, ClientOptions } from "@elastic/elasticsearch";
import { isObject, isUndefined, isArray, isNull } from "util";

let client: Client;

function resolve(o: any, deep: number) {

    for (let i in o) {
        if (isObject(o[i])) {
            if (deep)
                o[i] = resolve(o[i], deep--);
            else
                o[i] = JSON.stringify(o[i]);

        } else if (isUndefined(o[i]) || isNull(o[i])) {
            delete o[i];
        } else if (isArray(o[i])) {
            o[i] = JSON.stringify(o[i]);
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
        const context = resolve(isObject(event.data[1]) ? event.data[1] : {}, 3);

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
            client.index({
                index: 'exception',
                type: 'logger',
                body: {
                    time: new Date().toISOString(),
                    error: err.message,
                    category: event.categoryName,
                    level: event.level.levelStr.toLocaleLowerCase(),
                    message,
                    context: JSON.stringify(context),
                    trace: {
                        filename: event.data[2] || 'unknown',
                        function: event.data[3] || 'unknown',
                        line: event.data[4] || -1
                    },
                    pid: event.pid
                }
            });
        });
    }
}