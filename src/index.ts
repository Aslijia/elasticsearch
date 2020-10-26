import { Client, ClientOptions } from "@elastic/elasticsearch";

let client: Client;

export function configure(cfg: ClientOptions) {
  if (!client) {
    client = new Client(cfg);
  }

  return function (event: any) {
    const message = event.data[0];
    const context = event.data[1] || {};
    client
      .index({
        index: event.categoryName,
        type: "log4js",
        body: {
          time: event.startTime,
          category: event.categoryName,
          level: event.level.levelStr.toLocaleLowerCase(),
          message,
          context,
          trace: {
            filename: event.data[2] || "unknown",
            function: event.data[3] || "unknown",
            line: event.data[4] || -1,
          },
          pid: event.pid,
        },
      })
      .catch((err) => {
        console.error("error", {
          err: err.meta,
          category: event.categoryName,
          message,
        });
      });
  };
}
