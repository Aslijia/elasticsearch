import { Client, ClientOptions } from '@elastic/elasticsearch'
import { appendFile } from 'fs'
import { homedir } from 'os'

let client: Client | undefined

declare interface Content {
    categoryName: string
    startTime: string
    level: {
        levelStr: string
    }
    data: [string, any, string?, string?, string?]
    pid: string
}

function post2els(content: Content) {
    if (!client) {
        throw new Error(`cant write data 2 elasticsearch`)
    }
    client
        .index({
            index: content.categoryName,
            type: '_doc',
            body: {
                time: content.startTime,
                category: content.categoryName,
                level: content.level.levelStr,
                message: content.data[0],
                context: content.data[1],
                trace: {
                    filename: content.data[2] || '-',
                    function: content.data[3] || '-',
                    line: content.data[4] || -1
                },
                pid: content.pid
            }
        })
        .catch((err) => {
            appendFile(`${homedir()}/els-${process.pid}.log`, '>>:\n' + JSON.stringify(content, null, 4) + '/n' + err.body.error.reason, () => {})
        })
}

export function configure(cfg: ClientOptions) {
    if (!client) {
        client = new Client(cfg)
    }
    return post2els
}
