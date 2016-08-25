/*
  lin onetwo

  为了让 API 开发看起来更简洁，我把对 neo4j 数据库的常用操作都包装成一些函数

  数据库驱动并没有自带 promise ，我把它包装了一下，并加入了一个事务性开关
*/


import { v1 as neo4j } from 'neo4j-driver';
import uuid from 'node-uuid';
import xml from 'xml';
import * as path from 'path';

import sequencePromise from '../utils/sequencePromise';
import fs from '../utils/transaction-fs';

import { cleanNodeAndRelationships,
  commitTransactionOfNeo4jAndFs, rollbackTransactionOfNeo4jAndFs,
  matchUserNodeT, addHyperEdgeWithRelationshipToUserT, getUsersDefaulHyperedgeFormatT,
  addUserNodeAndItsDefaultHyperedge, addTagNodeWithRelationshipToHyperedgeThatOwnsByUser, addSiteNodeWithRelationshipToHyperedgeThatOwnsByUser, connectNodeToHyperedgeAndLetNodeOwnByUser,
  addPeriodHyperEdge, addNewNodeOwnsByUserToDefaultHyperEdge, addNodeOwnsByUserToDefaultHyperEdge, addNodeOwnsByUserToHyperEdge,
  addOneSiteToNodeThatOwnsByUser,
  canUserModifyNodeT,
} from './neo4jOperations';

import config from '../../src/config';

export const NO_RESULT = Symbol.for('NO_RESULT'); // 用于表示某些查找没有返回结果，这比 null 好
export const USERNAME_USED = Symbol.for('userName used');

export const STATIC_DEFAULT_HYPEREDGE = 'static-defaultHyperedge'; // 这意味着搜寻一下 :DEFAULT_HYPEREDGE 标签就能找到默认超边




export function useNeo4jDB(url, userName, passWord) {
  // Create a driver instance, for the user neo4j with password neo4j.
  const driver = neo4j.driver(`bolt://${url}`, neo4j.auth.basic(userName, passWord), { encrypted: true, trust: 'TRUST_ON_FIRST_USE' });

  // Create a session to run Cypher statements in.
  // Note: Always make sure to close sessions when you are done using them!
  const session = driver.session();

  let _session = session;
  let _lastTransaction = session;


  return (cypherQuery, transaction = undefined) => {
    if (transaction !== undefined) { // 只有 transaction 开关被显式指定了，才进入此分支
      _session = transaction ? session.beginTransaction() : session; // 如果打开事务性开关，就把接下来的所有命令
      // 都放在 session.beginTransaction() 里执行
      if (transaction === true) {
        _lastTransaction = _session; // 每次 transaction 开始后就保存一个 session.beginTransaction() 的副本，以便 commit
      }
    }
    return new Promise((resolve, reject) => {
      if (cypherQuery.query.length === 0 && transaction !== undefined) {
        // cypherQuery 中的请求为空字符串的情况视作只是想修改 transaction 模式
        resolve(_lastTransaction); // 见下方事务性调用的例子
      }

      _session.run(cypherQuery.query, cypherQuery.params)
      .then(result => {
        if (result.records.length === 0 || !result.records[0]) {
          resolve(NO_RESULT); // 没啥结果的时候
        } else {
          resolve(result.records); // 还是有点结果的时候
        }
      })
      .catch(err => reject(err));
    });
  };
}


// () => null sideEffect: 删光数据库
// 奇怪，好像不工作？
// reference: http://stackoverflow.com/questions/14252591/delete-all-nodes-and-relationships-in-neo4j-1-8
export function cleanTheDB(run) {
  return cleanNodeAndRelationships(run)
  // 先判断本地存储文件夹是否存在，不存在就创建一个
  .then(() => {
    if (!fs.existsSync(config.storage)) {
      return fs.mkdirRecursiveT(config.storage);
    }
  })
  // 然后就是清空各个子文件夹
  .then(() => {
    if (!fs.existsSync(path.join(config.storage, 'USER'))) {
      return fs.mkdirT(path.join(config.storage, 'USER'));
    }
    return fs.removeT(path.join(config.storage, 'USER')).then(() => fs.mkdirT(path.join(config.storage, 'USER')));
  })
  .then(() => {
    if (!fs.existsSync(path.join(config.storage, 'HYPEREDGE'))) {
      return fs.mkdirT(path.join(config.storage, 'HYPEREDGE'));
    }
    return fs.removeT(path.join(config.storage, 'HYPEREDGE')).then(() => fs.mkdirT(path.join(config.storage, 'HYPEREDGE')));
  })
  .then(() => fs.commit())
  .catch(err => fs.rollback(() => console.log(err)));
}


const getUserXML = (userInfo) => xml({ userName: userInfo.userName });


const getHyperEdgeXML = (hyperEdgeInfo) => xml({ hyperEdgeName: hyperEdgeInfo.hyperEdgeName });


const getNodeXML = (nodeInfo) => xml({ nodeName: nodeInfo.nodeName });


// utils
// 抽象出文件系统相关操作
// (string: storagePath) => {function: , ...}
export function getFsFunctions(storagePath) {
  return {
    newUserXML: (userInfo) => {
      if (typeof(userInfo.uuid) === 'string') {
        return fs.createWriteStreamT(path.join(storagePath, 'USER', `USER-${userInfo.uuid}.xml`)).then(writeStream => { writeStream.write(getUserXML(userInfo)); writeStream.end(); });
      }
      return Promise.reject('Error: userInfo.uuid is not a string in getFsFunctions.newUserXML');
    },
    newHyperEdgeXML: (hyperEdgeInfo) => {
      if (typeof(hyperEdgeInfo.uuid) === 'string') {
        return fs.createWriteStreamT(path.join(storagePath, 'HYPEREDGE', `HYPEREDGE-${hyperEdgeInfo.uuid}`, `HYPEREDGE-${hyperEdgeInfo.uuid}.xml`)).then(writeStream => { writeStream.write(getHyperEdgeXML(hyperEdgeInfo)); writeStream.end(); });
      }
      return Promise.reject('Error: hyperEdgeInfo.uuid is not a string in getFsFunctions.newHyperEdgeXML');
    },
    newNodeXML: (hyperEdgeUUID, nodeInfo) => {
      if (typeof(hyperEdgeUUID) !== 'string') {
        return Promise.reject('Error: hyperEdgeUUID is not a string in getFsFunctions.newNodeDir');
      }
      if (typeof(nodeInfo.uuid) !== 'string') {
        return Promise.reject('Error: nodeInfo.uuid is not a string in getFsFunctions.newNodeDir');
      }
      return fs.createWriteStreamT(path.join(storagePath, 'HYPEREDGE', `HYPEREDGE-${hyperEdgeUUID}`, `NODE-${nodeInfo.uuid}`, `NODE-${nodeInfo.uuid}.xml`)) // 把节点添加到这个超边的文件夹下
        .then(writeStream => { writeStream.write(getNodeXML({ nodeName: '' })); writeStream.end(); });
    },
    newHyperEdgeDir: (hyperEdgeInfo) => {
      if (typeof(hyperEdgeInfo.uuid) === 'string') {
        return fs.mkdirT(path.join(storagePath, 'HYPEREDGE', `HYPEREDGE-${hyperEdgeInfo.uuid}`));
      }
      return Promise.reject('Error: hyperEdgeInfo.uuid is not a string in getFsFunctions.newHyperEdgeDir');
    },
    newNodeDir: (hyperEdgeUUID, nodeInfo) => {
      if (typeof(hyperEdgeUUID) !== 'string') {
        return Promise.reject('Error: hyperEdgeUUID is not a string in getFsFunctions.newNodeDir');
      }
      if (typeof(nodeInfo.uuid) !== 'string') {
        return Promise.reject('Error: nodeInfo.uuid is not a string in getFsFunctions.newNodeDir');
      }
      return fs.mkdirT(path.join(storagePath, 'HYPEREDGE', `HYPEREDGE-${hyperEdgeUUID}`, `NODE-${nodeInfo.uuid}`));
    },
    rollback: (done) => fs.rollback(done),
    commit: (done) => fs.commit(done)
  };
}


/*eslint-disable */
//
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆　　　　　　◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　◆　　　　　　　　　　　　　　◆　　　　　　　　◆　　　　　◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　◆　　　　　　　　　　　　　　◆　　　　　　　　◆　　　　　◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　◆◆◆◆◆　　　　　　　　　　　◆◆◆　◆　　　　　　　　　　◆◆◆　◆　　　　　　　　◆　　　　　◆◆　　　　　　　　　　　　　　　　　　　　　　　◆　　　　　　　　　
// 　　　　◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　　　　　◆　　　　　◆◆　　　　　　　　◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆　　　　　
// 　　　　　◆　　◆◆◆　　　　　　　　　◆◆　　◆◆　　　　　　　　　◆◆　　◆◆　　　　　　　　◆　　　　　◆◆　　　　　　　　◆◆　◆◆　　　　　　　　　　◆◆　◆◆　　　　　
// 　　　　　◆◆◆◆◆◆　　　　　　　　◆◆　　　◆◆　　　　　　　　◆◆　　　◆◆　　　　　　　　◆◆　　　　◆◆　　　　　　　　◆◆◆◆　　　　　　　　　　　◆◆　　　　　　　　
// 　　　　◆◆◆　　◆◆　　　　　　　　◆◆　　　◆◆　　　　　　　　◆◆　　　◆◆　　　　　　　　◆◆　　　　◆◆　　　　　　　　　◆◆◆◆　　　　　　　　　　◆◆　　　　　　　　
// 　　　　◆◆　　◆◆◆　　　　　　　　　◆◆　◆◆◆　　　　　　　　　◆◆　◆◆◆　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　◆◆　　　◆　　　　　　　　　　◆◆　　　　　　　　
// 　　　　◆◆◆◆◆◆◆◆　　　　　　　　◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　　　　　◆◆◆◆◆◆　　　　　　　　　　◆◆　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆◆　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
/*eslint-enable */


// addUser({run, userInfo, defaultHyperEdgeInfo}) => Promise({userInfo, defaultHyperEdgeUUID})
//
// 为啥：一切之始，添加用户，还有它的默认超边
//
// 做啥：userInfo = {null: userUUID, userName, encryptedString: password}，把这几个东西都作为属性，然后添加默认超边，默认超边的初始名字就用用户名来当
export function addUser({ run, fsf = getFsFunctions(config.storage), userInfo, defaultHyperEdgeInfo = { uuid: uuid.v4(), hyperEdgeName: '默认超边' }, relationshipUUID = uuid.v4() }) {
  return matchUserNodeT(run, userInfo.userName)
  .then(result => {
    if (result === NO_RESULT) { // 意味着这个用户名并没有被使用过
      // 先创建 XML
      return fsf.newUserXML(userInfo)
      .then(() => fsf.newHyperEdgeDir(defaultHyperEdgeInfo))
      .then(() => fsf.newHyperEdgeXML(defaultHyperEdgeInfo))
      .then(() => addUserNodeAndItsDefaultHyperedge(run, userInfo, defaultHyperEdgeInfo, relationshipUUID));
    }
    return Promise.reject(USERNAME_USED);
  })
  // 如果上面都没有 reject 的话，下面完结一个 transaction
  .then(result => commitTransactionOfNeo4jAndFs(run, fsf, { userInfo, defaultHyperEdgeUUID: result[0].get('h.uuid') }))
  .catch(error => rollbackTransactionOfNeo4jAndFs(run, fsf, error));
}



/*eslint-disable */
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　　　　　◆　　　　　　　　　　　　　　　　　　　
// 　　　　　◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　　　　　　◆　　　　　　　　　　　　　　　　　　　
// 　　　　　◆　　　　　　　　　　　　　◆◆　　　◆◆　　　　　　　　　◆　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　　◆◆◆　◆　　　　　　　　　　　　◆◆◆　　　　
// 　　　　　◆◆◆◆◆　　　　　　　　　◆◆◆　　◆◆　　　　　　　　　◆◆◆◆◆◆　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　
// 　　　　　◆◆　◆◆　　　　　　　　　　◆◆　◆◆　　　　　　　　　　◆◆　◆◆◆　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　◆◆　　◆◆　　　　　　　　◆◆　　◆◆　　　　　
// 　　　　　◆　　　◆　　　　　　　　　　◆◆◆◆◆　　　　　　　　　　◆　　　◆◆　　　　　　　◆◆◆　　　　　　　　　　　　　◆◆　　　◆◆　　　　　　　　◆◆◆　◆◆　　　　　
// 　　　　　◆　　　◆　　　　　　　　　　　◆◆◆◆　　　　　　　　　　◆　　　◆◆　　　　　　　◆◆◆　　　　　　　　　　　　　◆◆　　　◆◆　　　　　　　　　◆◆◆◆◆　　　　　
// 　　　　　◆　　　◆　　　　　　　　　　　◆◆◆　　　　　　　　　　　◆◆　　◆◆　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆　◆◆◆　　　　　　　　◆◆◆　　　　　　　　
// 　　　　　◆　　　◆　　　　　　　　　　　　◆◆　　　　　　　　　　　◆◆◆◆◆◆　　　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　◆◆◆◆◆◆　　　　　　　　◆◆◆◆◆◆◆　　　　
// 　　　　　　　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　◆◆◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　◆◆　　　◆◆　　　　
// 　　　　　　　　　　　　　　　　　　　◆◆◆◆　　　　　　　　　　　　◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆◆◆◆◆　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
/*eslint-enable */


// addHyperEdge(
//   {run, fsf = getFsFunctions(), userInfo, hyperEdgeInfo = {hyperEdgeName: '', nodeUUIDList: [], tagsList: [], sitesList: []}}
// ) =>
// Promise([{"h.uuid": hyperEdgeUUID}, {"t.uuid": tagUUID}, {"s.uuid": siteUUID}, ...])
//
// 为啥：其中 hyperEdgeName 可用于在传入文件夹时直接用文件夹名创建超边，但如果不提供名字的话就用空 string 当名字，因为超边可以用位点等信息搜到，并不一定要名字。
//
// 做啥：检查传入的信息哪些是空的，然后用提供的信息创建新的 neo4j 节点，用 user 节点指向它。如果 nodeUUIDList 非空，把它看做一个超边，指向这个「超边」所连接的节点。
export function addHyperEdge({ run, fsf = getFsFunctions(config.storage), userInfo, hyperEdgeInfo = { uuid: uuid.v4(), hyperEdgeName: '', nodeUUIDList: [], tagsList: [], sitesList: [] } }) {
  return fsf.newHyperEdgeDir(hyperEdgeInfo)
    .then(() => fsf.newHyperEdgeXML(hyperEdgeInfo))
    .then(() => addHyperEdgeWithRelationshipToUserT(run, userInfo.uuid, hyperEdgeInfo))
    .then(result => {
      if (result === NO_RESULT) { // 必须要返回 uuid 不然说明创建失败了
        return Promise.reject('addHyperEdge Error: MATCH user or CREATE hyperedge failed in addHyperEdge');
      }
      // 接着创建一个返回 promise 的函数数组，使用 Promise.all(iterable) 保证它们都完成了操作
      const promiseArray = [() => Promise.resolve({ 'h.uuid': result[0].get('h.uuid') })];

      hyperEdgeInfo.tagsList.map(tagInfo => promiseArray.push(() => addTagNodeWithRelationshipToHyperedgeThatOwnsByUser(run, userInfo.uuid, hyperEdgeInfo.uuid, tagInfo)));
      hyperEdgeInfo.sitesList.map(siteInfo => promiseArray.push(() => addSiteNodeWithRelationshipToHyperedgeThatOwnsByUser(run, userInfo.uuid, hyperEdgeInfo.uuid, siteInfo)));
      hyperEdgeInfo.nodeUUIDList.map(nodeUUID => promiseArray.push(() => connectNodeToHyperedgeAndLetNodeOwnByUser(run, userInfo.uuid, hyperEdgeInfo.uuid, nodeUUID)));

      return sequencePromise(promiseArray);
    })
    .then(result => commitTransactionOfNeo4jAndFs(run, fsf, result))
    .catch(error => rollbackTransactionOfNeo4jAndFs(run, fsf, error));
}




/*eslint-disable */
//
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　◆　　　　　　　　　　　　　　　　◆　　　　　　　　　　　　◆　　　　　　　　　　　　◆◆◆◆　　　◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆　　　　
// 　　　　　◆　　　　　　　　　　　　　　　　◆　　　　　　　　　　　　◆　　　　　　　　　　　　◆◆◆◆　　　◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆　　　　
// 　　　　　◆◆◆◆◆　　　　　　　　　　　　◆　　　　　　　　　　　　◆　　　◆◆　　　　　　　◆◆◆◆◆　　◆◆　　　　　　　　　　◆　　　　　　　　　　　　　◆◆◆　◆　　　　
// 　　　　　◆◆◆◆◆◆　　　　　　　　　　　◆　　　　　　　　　　　　◆　　◆◆◆　　　　　　　◆◆　◆◆◆　◆◆　　　　　　　　◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　
// 　　　　　◆◆　　◆◆　　　　　　　　　　　◆　　　　　　　　　　　　◆　◆◆◆　　　　　　　　◆◆　　◆◆◆◆◆　　　　　　　　◆◆　　◆◆　　　　　　　　　◆◆　　◆◆　　　　
// 　　　　　◆　　　◆◆　　　　　　　　　　　◆　　　　　　　　　　　　◆◆◆◆　　　　　　　　　◆◆　　　◆◆◆◆　　　　　　　◆◆　　　◆◆　　　　　　　　◆◆　　　◆◆　　　　
// 　　　　　◆　　　◆◆　　　　　　　　　　　◆　　　　　　　　　　　　◆◆◆◆◆　　　　　　　　◆◆　　　◆◆◆◆　　　　　　　◆◆　　　　◆　　　　　　　　◆◆　　　◆◆　　　　
// 　　　　　◆◆　　◆◆　　　　　　　　　　　◆　　　　　　　　　　　　◆　　◆◆　　　　　　　　◆◆　　　　◆◆◆　　　　　　　　◆◆　　◆◆　　　　　　　　　◆◆　◆◆◆　　　　
// 　　　　　◆◆◆◆◆◆　　　　　　　　　　　◆　　　　　　　　　　　　◆　　　◆◆　　　　　　　◆◆　　　　　◆◆　　　　　　　　◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　
// 　　　　　　　◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆◆　　　　　　　　　　　◆◆◆　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
/*eslint-enable */




// addNode2DefaultHyperEdge(run, fsf = , userInfo, nodeInfo = , hyperEdgeInfo) => Promise({userInfo, nodeInfo})
//
// 为啥：用于添加空白节点，节点必须属于某个超边，所以当不提供超边UUID的时候，也得用这个添加节点，本着函数不要揽太多活的原则，提供超边UUID的时候请用 addNode2HyperEdge()
//
// 做啥：先用 userInfo 到neo4j里查看他默认要添加到哪个超边里（:DEFAULT_HYPEREDGE 指向的那个）可能是一个名叫“未归类”的超边，如果没获取到这个超边，那么这个用户可能是每半天创建一个新的以时间命名的超边等等，得看它的 defaultHyperedgeFormat 属性，为它新建一个超边。
export function addBlankNode2DefaultHyperEdge({ run, fsf = getFsFunctions(config.storage), userInfo, nodeInfo = { uuid: uuid.v4(), nodeName: '' }, hyperEdgeInfo }) {
  const createTime = new Date().getTime();
  return getUsersDefaulHyperedgeFormatT(run, userInfo.uuid)
  .then(result => {
    const defaultHyperedgeFormat = result[0].get('u.defaultHyperedgeFormat');

    let periodHyperEdgePromise = Promise.resolve(null);
    if (defaultHyperedgeFormat === STATIC_DEFAULT_HYPEREDGE) {
      // 也不干啥
    } else if (!!defaultHyperedgeFormat.match('period-') === true) { // 如果这 defaultHyperedgeFormat 的类型是 'period-3600000' 的感觉，也就是表示每小时创建一个超边的意思
    // 那么我们判断一下上一个默认超边到现在的时间，如果大于这个 3600000 毫秒，我们就创建一个新超边，不然就把节点加到默认超边里。这些微小的工作在下面这个函数里完成，返回 Promise(string: hyperEdgeUUID)
    // 其实咱也用不到它的返回值，只是用它修改一下当前的默认超边而已
      periodHyperEdgePromise = addPeriodHyperEdge({ run, fsf, userInfo, period: Number(defaultHyperedgeFormat.split('period-')[1]), hyperEdgeInfo });
    }

    return periodHyperEdgePromise.then(() => addNewNodeOwnsByUserToDefaultHyperEdge(run, userInfo.uuid, createTime, nodeInfo.uuid));
  })
  // 接着创建文件夹和 XML
  .then(result => fsf.newNodeDir(result[0].get('h.uuid'), nodeInfo)
    .then(() => { fsf.newNodeXML(result[0].get('h.uuid'), nodeInfo); return result; }) // 把 result 传下去
  )
  .then(result => commitTransactionOfNeo4jAndFs(run, fsf, { userInfo, nodeInfo }))
  .catch(error => rollbackTransactionOfNeo4jAndFs(run, fsf, error));
}




/*eslint-disable */
//
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　◆　　　　　　　　　　　　　　◆　　　　　　　◆◆◆◆　　　◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　◆　　　　　　　　　　　　　　◆　　　　　　　◆◆◆◆　　　◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆　　　　
// 　　　　　◆◆◆◆◆　　　　　　　　　　　◆◆◆　◆　　　　　　　　　　◆◆◆　◆　　　　　　　◆◆◆◆◆　　◆◆　　　　　　　　　　◆　　　　　　　　　　　　　◆◆◆　◆　　　　
// 　　　　◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　　　　◆◆　◆◆◆　◆◆　　　　　　　　◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　
// 　　　　　◆　　◆◆◆　　　　　　　　　◆◆　　◆◆　　　　　　　　　◆◆　　◆◆　　　　　　　◆◆　　◆◆◆◆◆　　　　　　　　◆◆　　◆◆　　　　　　　　　◆◆　　◆◆　　　　
// 　　　　　◆◆◆◆◆◆　　　　　　　　◆◆　　　◆◆　　　　　　　　◆◆　　　◆◆　　　　　　　◆◆　　　◆◆◆◆　　　　　　　◆◆　　　◆◆　　　　　　　　◆◆　　　◆◆　　　　
// 　　　　◆◆◆　　◆◆　　　　　　　　◆◆　　　◆◆　　　　　　　　◆◆　　　◆◆　　　　　　　◆◆　　　◆◆◆◆　　　　　　　◆◆　　　　◆　　　　　　　　◆◆　　　◆◆　　　　
// 　　　　◆◆　　◆◆◆　　　　　　　　　◆◆　◆◆◆　　　　　　　　　◆◆　◆◆◆　　　　　　　◆◆　　　　◆◆◆　　　　　　　　◆◆　　◆◆　　　　　　　　　◆◆　◆◆◆　　　　
// 　　　　◆◆◆◆◆◆◆◆　　　　　　　　◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　　　　◆◆　　　　　◆◆　　　　　　　　◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　
// 　　　　　　　　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆◆　　　　　　　　　　　◆◆◆　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
/*eslint-enable */


// addNode2DefaultHyperEdge({run, userInfo, nodeUUID}) => Promise({hyperEdgeUUID, nodeUUID})
//
// 为啥：用于把已有节点添加到超边，节点必须属于某个超边，所以当不提供超边UUID的时候，也得用这个添加节点，本着函数不要揽太多活的原则，提供超边UUID的时候请用 addNode2HyperEdge()
//
// 做啥：先用 userInfo 到neo4j里查看他默认要添加到哪个超边里（:DEFAULT_HYPEREDGE 指向的那个）可能是一个名叫“未归类”的超边，如果没获取到这个超边，那么这个用户可能是每半天创建一个新的以时间命名的超边等等，得看它的 defaultHyperedgeFormat 属性，为它新建一个超边。
export function addNode2DefaultHyperEdge({ run, fsf = getFsFunctions(config.storage), userInfo, nodeInfo, hyperEdgeInfo }) {
  return getUsersDefaulHyperedgeFormatT(run, userInfo.uuid)
  .then((result) => {
    const defaultHyperedgeFormat = result[0].get('u.defaultHyperedgeFormat');
    let periodHyperEdgePromise = Promise.resolve(null);
    if (defaultHyperedgeFormat === STATIC_DEFAULT_HYPEREDGE) {
      // 也不干啥
    } else if (!!defaultHyperedgeFormat.match('period-') === true) { // 如果这 defaultHyperedgeFormat 的类型是 'period-3600000' 的感觉，也就是表示每小时创建一个超边的意思
    // 那么我们判断一下上一个默认超边到现在的时间，如果大于这个 3600000 毫秒，我们就创建一个新超边，不然就把节点加到默认超边里。这些微小的工作在下面这个函数里完成，返回 Promise(string: hyperEdgeUUID)
    // 其实咱也用不到它的返回值，只是用它修改一下当前的默认超边而已
      periodHyperEdgePromise = addPeriodHyperEdge({ run, fsf, userInfo, period: Number(defaultHyperedgeFormat.split('period-')[1]), hyperEdgeInfo });
    }

    return periodHyperEdgePromise.then(hyperEdgeUUID => addNodeOwnsByUserToDefaultHyperEdge(run, userInfo.uuid, nodeInfo.uuid)).then(createResult => createResult === NO_RESULT ? Promise.reject('MATCH user or CREATE new node failed') : createResult); // 如果没有结果，那肯定就是出错了
  })
  .then(result => commitTransactionOfNeo4jAndFs(run, fsf, { hyperEdgeUUID: result[0].get('h.uuid'), nodeInfo }))
  .catch(error => rollbackTransactionOfNeo4jAndFs(run, fsf, error));
}




/*eslint-disable */
//
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　◆　　　　　　　　　　　　　　◆　　　　　　　　　◆◆◆◆◆◆◆　　　　　　◆◆　　　　　◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　◆　　　　　　　　　　　　　　◆　　　　　　　　◆◆◆◆　◆◆◆　　　　　　◆◆　　　　　◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　◆◆◆◆◆　　　　　　　　　　　◆◆◆　◆　　　　　　　　　　◆◆◆　◆　　　　　　　　◆◆　　　　◆◆　　　　　　◆◆　　　　　◆◆　　　　　　　◆◆　　　◆◆　　　　　　　　　◆　　　　　　　　　
// 　　　　◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　　　　　　　　　　　◆◆　　　　　　◆◆　　　　　◆◆　　　　　　　◆◆◆　　◆◆　　　　　　　　　◆◆◆◆◆◆　　　　
// 　　　　　◆　　◆◆◆　　　　　　　　　◆◆　　◆◆　　　　　　　　　◆◆　　◆◆　　　　　　　　　　　　　◆◆◆　　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　◆◆　◆◆　　　　　　　　　　◆◆　◆◆◆　　　　
// 　　　　　◆◆◆◆◆◆　　　　　　　　◆◆　　　◆◆　　　　　　　　◆◆　　　◆◆　　　　　　　　　　　◆◆◆◆　　　　　　　◆◆　　　　　◆◆　　　　　　　　◆◆◆◆◆　　　　　　　　　　◆　　　◆◆　　　　
// 　　　　◆◆◆　　◆◆　　　　　　　　◆◆　　　◆◆　　　　　　　　◆◆　　　◆◆　　　　　　　　　　◆◆◆◆　　　　　　　　◆◆　　　　　◆◆　　　　　　　　　◆◆◆◆　　　　　　　　　　◆　　　◆◆　　　　
// 　　　　◆◆　　◆◆◆　　　　　　　　　◆◆　◆◆◆　　　　　　　　　◆◆　◆◆◆　　　　　　　　◆◆◆◆　　　　　　　　　　◆◆　　　　　◆◆　　　　　　　　　◆◆◆　　　　　　　　　　　◆◆　　◆◆　　　　
// 　　　　◆◆◆◆◆◆◆◆　　　　　　　　◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　◆◆　　　　　◆◆　　　　　　　　　　◆◆　　　　　　　　　　　◆◆◆◆◆◆　　　　
// 　　　　　　　　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　◆◆◆◆◆　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆◆　　　　　　　　　　　　◆　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
/*eslint-enable */


// addNode2HyperEdge({run, userInfo, nodeInfo, hyperEdgeUUID}) => Promise({hyperEdgeUUID, nodeInfo})
//
// 动机：当指明把节点添加到某个超边时用这个。可以把某个 hyperEdgeUUID 当做 nodeUUID 传入，从而嵌套超边。
//
// 实现：先检查 nodeUUID 和 hyperEdgeUUID 是不相等的非空值，然后让 hyperEdgeUUID 多一条指向 nodeUUID 的边。


export function addNode2HyperEdge({ run, userInfo, nodeInfo, hyperEdgeUUID }) {
  if (nodeInfo.uuid === hyperEdgeUUID) {
    return Promise.reject('addNode2HyperEdge Error: nodeUUID == hyperEdgeUUID');
  }
  return addNodeOwnsByUserToHyperEdge(run, userInfo.uuid, nodeInfo.uuid, hyperEdgeUUID)
  .then(result => result === NO_RESULT ? Promise.reject('addNode2HyperEdge Error: something wrong happened in addNodeOwnsByUserToHyperEdge()') : { nodeInfo, hyperEdgeUUID });
}

/*
 █████  ██████  ██████  ███████ ██ ████████ ███████ ██████  ███    ██  ██████  ██████  ███████
██   ██ ██   ██ ██   ██ ██      ██    ██    ██           ██ ████   ██ ██    ██ ██   ██ ██
███████ ██   ██ ██   ██ ███████ ██    ██    █████    █████  ██ ██  ██ ██    ██ ██   ██ █████
██   ██ ██   ██ ██   ██      ██ ██    ██    ██      ██      ██  ██ ██ ██    ██ ██   ██ ██
██   ██ ██████  ██████  ███████ ██    ██    ███████ ███████ ██   ████  ██████  ██████  ███████
*/



// addSite2Node({run, userInfo, nodeUUID, array[string]: sitesList， bool: manualGenerated = false}) => Promise({nodeUUID, siteUUID})
//
// 动机：用户可能需要描述文档的局部，这时需要在文档 XML 里添加位点；并且方便将局部与其他文档关联起来，这时需要在 neo4j 里添加位点。所以这个函数需要原子性（atomic）地将一个位点添加到 XML 和 neo4j 里。然后返回的对象里会有位点在 neo4j 里的 UUID。
//
// 实现：检查传入值非空后，用 nodeUUID 找到对应节点，然后用 userInfo 验证有无修改权限，有的话就用 sitesList 创建文档节点指向的位点节点,带上manualGenerated: true 表示这个位点不是算法自动生成的而是人的主观判断，并返回位点节点的 uuid，然后在 XML 里创建 标签，带上位点节点的 uuid。

export function addSite2Node({ run, fsf = getFsFunctions(config.storage), userInfo, nodeUUID, sitesList, manualGenerated = false }) {
  if (nodeUUID === undefined) {
    return Promise.reject('addSite2Node Error: nodeUUID === undefined');
  }
  if (userInfo === undefined) {
    return Promise.reject('addSite2Node Error: userInfo === undefined');
  }
  if (sitesList === undefined) {
    return Promise.reject('addSite2Node Error: sitesList === undefined');
  }
  return canUserModifyNodeT(run, userInfo, nodeUUID)
  .then(result => {
    const promiseArray = [];

    sitesList.map(siteUUID => promiseArray.push(() => addOneSiteToNodeThatOwnsByUser(run, userInfo.uuid, siteUUID, nodeUUID, manualGenerated)));

    return sequencePromise(promiseArray);
  })
  // .then(result => {
  //   const promiseArray = [];
  //
  //
  //   return getFileByUUID(fsf, nodeUUID)
  //   .then(file => {
  //     sitesList.map(siteUUID => promiseArray.push(() => addSiteToNodeXML(file, siteUUID)));
  //     return sequencePromise(promiseArray);
  //   });
  // })
  .then(result => commitTransactionOfNeo4jAndFs(run, fsf, { siteUUIDList: result }))
  .catch(error => rollbackTransactionOfNeo4jAndFs(run, fsf, error));
}

/*
█████  ██████  ██████  ████████  █████   ██████  ██████  ███    ██  ██████  ██████  ███████
██   ██ ██   ██ ██   ██    ██    ██   ██ ██            ██ ████   ██ ██    ██ ██   ██ ██
███████ ██   ██ ██   ██    ██    ███████ ██   ███  █████  ██ ██  ██ ██    ██ ██   ██ █████
██   ██ ██   ██ ██   ██    ██    ██   ██ ██    ██ ██      ██  ██ ██ ██    ██ ██   ██ ██
██   ██ ██████  ██████     ██    ██   ██  ██████  ███████ ██   ████  ██████  ██████  ███████
*/




// addTag2Node({run, userInfo, nodeUUID, array: tagsList }) => Promise({nodeUUID})
//
// 动机：用户可能需要添加对整个文档的描述，而不是描述文档中的局部，这时候就得加 Tag
//
// // 实现：检查传入值非空后，用 nodeUUID 找到对应节点，然后用 userInfo 验证有无修改权限，有的话就用 tagsList 在 neo4j 里 MERGE 一个个「user节点」指向的 tag 节点，然后让当前文档节点指向它们， XML 里创建 标签，带上 uuid。
export function addTag2Node({ run, fsf = getFsFunctions(config.storage), userInfo, nodeUUID, tagsList, manualGenerated = false }) {
  if (nodeUUID === undefined) {
    return Promise.reject('addTag2Node Error: nodeUUID === undefined');
  }
  if (userInfo === undefined) {
    return Promise.reject('addTag2Node Error: userInfo === undefined');
  }
  if (tagsList === undefined) {
    return Promise.reject('addTag2Node Error: tagsList === undefined');
  }
  return canUserModifyNodeT(userInfo, nodeUUID)
  .then(result => {
    const promiseArray = [];

    tagsList.map(tagUUID => promiseArray.push(() => addTagToNodeThatOwnsByUser(run, userInfo.uuid, tagUUID, nodeUUID)));

    return sequencePromise(promiseArray);
  })
  .then(result => {
    const promiseArray = [];


    return getFileByUUID(fsf, nodeUUID)
    .then(file => {
      tagsList.map(tagUUID => promiseArray.push(() => addSiteToNodeXML(file, tagUUID)));
      return sequencePromise(promiseArray);
    });
  })
  .then(result => commitTransactionOfNeo4jAndFs(run, fsf, { nodeUUID }))
  .catch(error => rollbackTransactionOfNeo4jAndFs(run, fsf, error));
}
