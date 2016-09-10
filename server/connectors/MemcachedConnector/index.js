import memjs from 'memjs';
import Promise from 'bluebird';


export default class MemecachedConnector {
  constructor() {
    this.client = memjs.Client.create();
  }

  setMemcached(key, value, expireTime) {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, (err, val) => !!err ? reject(err) : resolve(val), expireTime);
    });
  }

  getMemcachedString(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, val) => !!err ? reject(err) : resolve(val));
    });
  }
}