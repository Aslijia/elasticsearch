import { Client, ClientOptions } from '@elastic/elasticsearch'

let client: Client

export function configure(cfg: ClientOptions) {
	if (!client) {
		client = new Client(cfg)
	}

	const els = function (event: any) {
		const message = event.data[0]
		const context = event.data[1] || {}
		client
			.index({
				index: event.categoryName,
				type: 'log4js',
				body: {
					time: event.startTime,
					category: event.categoryName,
					level: event.level.levelStr.toLocaleLowerCase(),
					message,
					context,
					trace: {
						filename: event.data[2] || '-',
						function: event.data[3] || '-',
						line: event.data[4] || -1,
					},
					pid: event.pid,
				},
			})
			.catch((err) => {
				els({
					categoryName: 'accidental',
					startTime: event.startTime,
					pid: event.pid,
					level: event.level,
					data: ['elasticsearch write failed', err.meta],
				})
			})
	}
	return els
}
