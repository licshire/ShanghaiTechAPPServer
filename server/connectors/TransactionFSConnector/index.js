import path from 'path';
import Promise from 'bluebird';

import fs from 'fs-transaction';

import { v4 as isuuid } from 'is-uuid';
import { v4 as uuid } from 'node-uuid';


export default class TransactionFSConnector {
  basePath: string;

  constructor(basePath: string) {
    try {
      let stats = fs.lstatSync(basePath);
      if (!stats.isDirectory()) {
        throw new Error('basePath-isnot-Dir TransactionFSConnector()');
      }

      this.basePath = basePath;
    }
    catch (e) {
      throw e;
    }
  }

  commit(callback: Function = () => {}) {
    return fs.commit(callback)
    .then(() => {success: true})
    .catch(err => Promise.reject(`commit-fail ${String(err)} at TransactionFSConnector.commit`));
  }

  rollback(callback: Function = () => {}) {
    return fs.rollback(callback)
    .then(result => Promise.reject(`rollback ${String(result)} at TransactionFSConnector.rollback`));
  }

  createMarkdown({folderUUID, fileUUID, markdown}): Promise<string> {
    if (isuuid(folderUUID) && isuuid(fileUUID)) {
      const filePath = path.join(this.basePath, folderUUID, fileUUID, fileUUID + '.md');
      // before
      return Promise.try(() =>
        fs.mkdirT(path.join(this.basePath, folderUUID, fileUUID ))
      )
      .then(() =>
        fs.createWriteStreamT(filePath)
      )
      .then(writeStream => {
        writeStream.write(markdown); writeStream.end()
      })
      .then(() =>
        fs.commit()
      )


      // after
      return _.flow(
        fs.mkdir(path.join(this.basePath, folderUUID, fileUUID )),
        fs.createWriteStream(filePath),
        fs.writeStream(writeStream => {writeStream.write(markdown); writeStream.end()}),
        fs.commit
      )

      .then(() => path.join(folderUUID, fileUUID, fileUUID + '.md').split(path.sep).join('/'));
    }
    return Promise.reject(`invalid-uuid folderUUID === ${folderUUID} or fileUUID === ${fileUUID} , is not a uuid at TransactionFSConnector.createMarkdown`);
  }

  createMemePathFolder({folderUUID}) {
    if (isuuid(folderUUID)) {
      return fs.mkdirT(path.join(this.basePath, folderUUID))
        .then(() => fs.commit())
        .then(() => folderUUID);
    }
    return Promise.reject(`invalid-uuid hyperEdgeInfo.uuid === ${folderUUID} ,is not a uuid at TransactionFSConnector.addHyperEdgeFolder`);
  }

}
