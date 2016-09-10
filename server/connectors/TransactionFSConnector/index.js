// @flow
import fs from './transaction-fs';

import { v4 as isuuid } from 'is-uuid';
import { v4 as uuid } from 'node-uuid';
import path from 'path';

type userInfo = {
  userUUID: ?string,
  basePath: ?string
};

type returnObject = {
  success: boolean,
  reason: ?string
};

export default class TransactionFSConnector {
  basePath: string;
  userUUID: string;
  constructor({ userUUID, basePath }: userInfo) {

    // $FlowFine: flow dont understan what isuuid() does
    this.userUUID = isuuid(userUUID) ? userUUID : uuid();

    try {
      let stats = fs.lstatSync(basePath);
      if (!stats.isDirectory()) {
        throw new Error('basePath-isnot-Dir at TransactionFSConnector');
      }
      // $FlowFine: flow dont understan what isDirectory() does
      this.basePath = basePath;
    }
    catch (e) {
        throw e;
    }

  }

  commit(callback: Function = () => {}): Promise<returnObject> {
    return fs.commit(callback)
    .then(() => {success: true})
    .catch(err => Promise.reject({success: false, reason: `commit-fail ${String(err)} at TransactionFSConnector.commit`}));
  }

  rollback(callback: Function = () => {}): Promise<returnObject> {
    return fs.rollback(callback)
    .then(result => Promise.reject({success: false, reason: `rollback ${String(result)} at TransactionFSConnector.rollback`}));
  }

  addHyperEdgeFolder(hyperEdgeInfo: {uuid: string}): Promise<returnObject> {
    if (isuuid(hyperEdgeInfo.uuid)) {
      return fs.mkdirT(path.join(this.basePath, 'HYPEREDGE', `HYPEREDGE-${hyperEdgeInfo.uuid}`))
      .then(() => {success: true});
    }
    return Promise.reject({success: false, reason: `invalid-uuid hyperEdgeInfo.uuid === ${hyperEdgeInfo.uuid} ,is not a uuid at TransactionFSConnector.addHyperEdgeFolder`});
  }

}
