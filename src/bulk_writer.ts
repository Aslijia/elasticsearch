import { Client } from "elasticsearch";

const fs = require('fs');
const path = require('path');
const retry = require('retry');

export class BulkWriter {
  client: Client;
  options: any;
  interval: number;
  waitForActiveShards: string;
  bulk: object[] = [];
  running: boolean = false;
  timer: NodeJS.Timer | undefined;
  esConnection: boolean = false;
  constructor(client: Client, options: any) {
    this.client = client;
    this.options = options || {};
    this.interval = options.interval || 5000;
    this.waitForActiveShards = options.waitForActiveShards || '1';
  }

  start() {
    this.checkEsConnection();
  }

  stop() {
    this.running = false;
    if (!this.timer) { return; }
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  schedule() {
    const thiz = this;
    this.timer = setTimeout(() => {
      thiz.tick();
    }, this.interval);
  }

  tick() {
    const thiz = this;
    if (!this.running) { return; }
    this.flush()
      .then(() => {
        // Emulate finally with last .then()
      })
      .then(() => { // finally()
        thiz.schedule();
      });
  };

  flush() {
    // write bulk to elasticsearch
    if (this.bulk.length === 0) {
      return new Promise((resolve: Function) => {
        return resolve();
      });
    }
    const bulk = this.bulk.concat();
    this.bulk = [];
    const body: object[] = [];
    bulk.forEach((element: any) => {
      body.push({ index: { _index: element.index, _type: element.type, pipeline: this.options.pipeline } }, element.doc);
    });
    return this.write(body);
  };

  append(index: string, type: string, doc: object) {
    if (this.options.buffering === true) {
      if (typeof this.options.bufferLimit === 'number' && this.bulk.length >= this.options.bufferLimit) {
        // @todo: i guess we can use callback to notify caller
        return;
      }
      this.bulk.push({
        index, type, doc
      });
    } else {
      this.write([{ index: { _index: index, _type: type, pipeline: this.options.pipeline } }, doc]);
    }
  };

  write(body: object[]) {
    const thiz = this;
    return this.client.bulk({
      body,
      waitForActiveShards: this.waitForActiveShards,
      timeout: this.interval + 'ms',
      type: 'logs4js'
    }).then((res) => {
      if (res.errors && res.items) {
        res.items.forEach((item: { index: { error: any; }; }) => {
          if (item.index && item.index.error) {
            // eslint-disable-next-line no-console
            console.error('Elasticsearch index error', item.index);
          }
        });
      }
    }).catch((e) => { // prevent [DEP0018] DeprecationWarning
      // rollback this.bulk array
      const lenSum = thiz.bulk.length + body.length;
      if (thiz.options.bufferLimit && (lenSum >= thiz.options.bufferLimit)) {
        thiz.bulk = body.concat(thiz.bulk.slice(0, thiz.options.bufferLimit - body.length));
      } else {
        thiz.bulk = body.concat(thiz.bulk);
      }
      // eslint-disable-next-line no-console
      console.error('Elasticsearch connection has error', e);
      this.stop();
      this.checkEsConnection();
    });
  };

  checkEsConnection() {
    const thiz = this;
    thiz.esConnection = false;

    const operation = retry.operation({
      forever: true,
      retries: 1,
      factor: 1,
      minTimeout: 1 * 1000,
      maxTimeout: 60 * 1000,
      randomize: false
    });
    return new Promise((fulfill: Function, reject: Function) => {
      operation.attempt(() => {
        thiz.client.ping({}).then(
          (res: any) => {
            thiz.esConnection = true;
            // Ensure mapping template is existing if desired
            if (thiz.options.ensureMappingTemplate) {
              thiz.ensureMappingTemplate(fulfill, reject);
            } else {
              fulfill(true);
            }
            if (thiz.options.buffering === true) {
              thiz.running = true;
              thiz.tick();
            }
          },
          (err: object) => {
            if (operation.retry(err)) {
              return;
            }
            // thiz.esConnection = false;
            console.error('Cannot connect to Elasticsearch');
            reject(new Error('Cannot connect to ES'));
          }
        );
      });
    });
  };

  ensureMappingTemplate(fulfill: Function, reject: Function) {
    const thiz = this;
    // eslint-disable-next-line prefer-destructuring
    let mappingTemplate = thiz.options.mappingTemplate;
    if (mappingTemplate === null || typeof mappingTemplate === 'undefined') {
      const rawdata = fs.readFileSync(path.join(__dirname, 'index-template-mapping.json'));
      mappingTemplate = JSON.parse(rawdata);
    }
    const tmplCheckMessage = {
      name: 'template_' + (typeof thiz.options.indexPrefix === 'function' ? thiz.options.indexPrefix() : thiz.options.indexPrefix)
    };
    thiz.client.indices.getTemplate(tmplCheckMessage).then(
      (res) => {
        fulfill(res);
      },
      (res) => {
        if (res.status && res.status === 404) {
          const tmplMessage = {
            name: 'template_' + (typeof thiz.options.indexPrefix === 'function' ? thiz.options.indexPrefix() : thiz.options.indexPrefix),
            create: true,
            body: mappingTemplate
          };
          thiz.client.indices.putTemplate(tmplMessage).then(
            (res1) => {
              fulfill(res1);
            },
            (err1) => {
              reject(err1);
            }
          );
        }
      }
    );
  };
}
