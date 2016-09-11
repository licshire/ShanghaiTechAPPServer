/*
  lin onetwo

  为了让 neo4jAPI.js 看起来更清爽，我重构了它，并把 graphQL 语句都抽到这里

  名字中以 T 结尾的函数是打开了事务性操作开关的函数，事务性状态是全局存在的，最后还得在用完后手动 commit
*/
import uuid from 'node-uuid';

import { NO_RESULT } from './neo4jAPI';


/*eslint-disable */
//
// 　　　◆◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　◆◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　◆◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆◆◆◆　　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　　　　◆◆◆◆◆◆　　　　　
// 　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆　　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆◆◆◆◆　　　　　
// 　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　
// 　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆　　　　　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆　◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆　　　　　　　　　
// 　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆　　　　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　　　◆◆◆◆◆◆　　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆　　　　　　　　　
// 　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　◆◆◆◆◆　◆◆◆　　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　　　　◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆　◆◆◆　　　　　　　　　　◆◆◆◆　　　　　　　　　
// 　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　◆◆◆◆　◆◆◆◆　　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　　◆◆◆　◆◆◆◆　　　　　　　　　◆◆◆◆　◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　
// 　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆◆◆◆◆　　　　　
// 　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　　　◆◆◆◆◆◆　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
/*eslint-enable */


export function matchUserNodeT(run, userName) {
  return run({ // 首先开启 transaction
    query: 'MATCH (u:USER {userName: {userName}}) RETURN u',
    params: {
      userName
    }
  }, true);
}


export function addHyperEdgeWithRelationshipToUserT(run, userUUID, hyperEdgeInfo) {
  return run({ // 首先创建一个 HYPEREDGE 节点， 开启 transaction
    query: 'MATCH (u:USER {uuid: {userUUID}}) CREATE (u)-[:OWN {uuid: {relationshipUUID}}]->(h:HYPEREDGE {uuid: {hyperEdgeUUID}, name:{hyperEdgeName}, createTime:{createTime}, lastUsedTime:{createTime}}) RETURN h.uuid',
    params: {
      userUUID,
      hyperEdgeUUID: hyperEdgeInfo.uuid,
      relationshipUUID: uuid.v4(),
      createTime: new Date().getTime(),
      hyperEdgeName: hyperEdgeInfo.hyperEdgeName
    }
  }, true);
}


export function getUsersDefaulHyperedgeFormatT(run, userUUID) {
  return run({ // 先用 userInfo 到neo4j里查看他默认要添加到哪个超边里， 开启 transaction
    query: 'MATCH (u:USER {uuid: {userUUID}}) RETURN u.defaultHyperedgeFormat',
    params: {
      userUUID
    }
  }, true);
}

export function canUserModifyNodeT(run, userInfo, nodeUUID) {
  return run({
    query: 'MATCH (u:USER {uuid: {userUUID}})-[:HAS]->(n:NODE {uuid: {nodeUUID}}) RETURN u.uuid',
    params: {
      userUUID:userInfo.uuid,
      nodeUUID
    }
  }, true);
}

/*eslint-disable */
//
// 　　　◆◆◆◆　　　　　◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆◆◆◆　　　　　　　
// 　　　◆◆◆◆　　　　　◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆◆◆◆　　　　　　　
// 　　　◆◆◆◆◆　　　　◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆　　　　　　　
// 　　　◆◆◆◆◆◆　　　◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆　　　　　　　
// 　　　◆◆◆◆◆◆◆　　◆◆◆　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　◆◆◆◆◆◆◆◆　◆◆◆◆◆　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　　　　　◆◆◆　　　　　　　
// 　　　◆◆◆◆◆◆◆　　◆◆◆　　　　　　　◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　　　　◆◆◆　　　　　　　
// 　　　◆◆◆　◆◆◆◆　◆◆◆　　　　　　　◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　　　　◆◆◆　　　　　　　
// 　　　◆◆◆　◆◆◆◆　◆◆◆　　　　　　　◆◆◆　　　　◆◆◆　　　　　　　　　　◆◆◆◆　　　　　　　　　　◆◆◆　　◆◆◆◆　　◆◆◆◆　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　　　　◆◆◆　　　　　　　
// 　　　◆◆◆　　◆◆◆◆◆◆◆　　　　　　　◆◆◆　　　　◆◆◆　　　　　　　　　　◆◆◆◆　　　　　　　　　　◆◆◆　　　◆◆◆　　　◆◆◆　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　　　　◆◆◆　　　　　　　
// 　　　◆◆◆　　　◆◆◆◆◆◆　　　　　　　◆◆◆　　　　◆◆◆　　　　　　　　　　◆◆◆　　　　　　　　　　　◆◆◆　　　◆◆◆　　　◆◆◆　　　　　◆◆◆◆◆　◆◆◆　　　　　　　　　　　　　◆◆◆　　　　　　　
// 　　　◆◆◆　　　◆◆◆◆◆◆　　　　　　　◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆　　　　　　　　　　　◆◆◆　　　◆◆◆　　　◆◆◆　　　　　◆◆◆◆　◆◆◆◆　　　　　　　　　　　　　◆◆◆　　　　　　　
// 　　　◆◆◆　　　　◆◆◆◆◆　　　　　　　◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆　　　　　　　　　　　◆◆◆　　　◆◆◆　　　◆◆◆　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　
// 　　　◆◆◆　　　　　◆◆◆◆　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆　　　　　　　　　　　◆◆◆　　　◆◆◆　　　◆◆◆　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
/*eslint-enable */
export function cleanNodeAndRelationships(run) {
  return run({
    query: 'MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r'
  });
}


export function addUserNodeAndItsDefaultHyperedge(run, userInfo, defaultHyperEdgeInfo, relationshipUUID) {
  return run({ // 然后创建一个 USER 节点和它的 DEFAULT_HYPEREDGE 节点
    query: 'CREATE (u:USER {uuid: {userUUID}, userName: {userName}, password: {password}, defaultHyperedgeFormat: {defaultHyperedgeFormat}, createTime:{createTime}, lastUsedTime:{createTime}})-[r:OWN {uuid: {relationshipUUID}}]->(h:HYPEREDGE :DEFAULT_HYPEREDGE {uuid: {hyperEdgeUUID}, name:{hyperEdgeName}, createTime:{createTime}, lastUsedTime:{createTime}}) RETURN u.uuid, h.uuid',
    params: {
      userUUID: userInfo.uuid,
      userName: userInfo.userName,
      password: userInfo.password,
      defaultHyperedgeFormat: userInfo.defaultHyperedgeFormat,
      relationshipUUID,
      hyperEdgeUUID: defaultHyperEdgeInfo.uuid,
      createTime: new Date().getTime(),
      hyperEdgeName: userInfo.userName
    }
  });
}


export function addTagNodeWithRelationshipToHyperedgeThatOwnsByUser(run, userUUID, hyperEdgeUUID, tagInfo) {
  return run({
    query: 'MATCH (h:HYPEREDGE {uuid: {hyperEdgeUUID}}), (u:USER {uuid: {userUUID}}) CREATE (h)-[:HAS {uuid: {relationshipUUID1}}]->(t:TAG {uuid: {tagUUID}, name:{tagName}})<-[:OWN {uuid:{relationshipUUID2}}]-(u) RETURN t.uuid',
    params: {
      hyperEdgeUUID,
      userUUID,
      tagUUID: tagInfo.tagUUID,
      relationshipUUID1: uuid.v4(),
      relationshipUUID2: uuid.v4(),
      tagName: tagInfo.tagName
    }
  }).then(createResult => {
    if (createResult === NO_RESULT) { // 只要有一个挂了，就让整个 promise 挂掉
      return Promise.reject(`addHyperEdge Error: MATCH user or CREATE tag ${tagInfo.tagName} failed`);
    }
    return { 't.uuid': createResult[0].get('t.uuid') };
  });
}


export function addSiteNodeWithRelationshipToHyperedgeThatOwnsByUser(run, userUUID, hyperEdgeUUID, siteInfo) {
  return run({
    query: 'MATCH (h:HYPEREDGE {uuid: {hyperEdgeUUID}}), (u:USER {uuid: {userUUID}}) CREATE (h)-[:HAS {uuid: {relationshipUUID1}}]->(s:SITE {uuid: {siteUUID}, name:{siteName}})<-[:OWN {uuid:{relationshipUUID2}}]-(u) RETURN s.uuid',
    params: {
      hyperEdgeUUID,
      userUUID,
      siteUUID: siteInfo.siteUUID,
      relationshipUUID1: uuid.v4(),
      relationshipUUID2: uuid.v4(),
      siteName: siteInfo.siteName
    }
  }).then(createResult => {
    if (createResult === NO_RESULT) { // 只要有一个挂了，就让整个 promise 挂掉
      return Promise.reject(`addHyperEdge Error: MATCH user or CREATE site: ${siteInfo.siteName} failed`);
    }
    return { 's.uuid': createResult[0].get('s.uuid') };
  });
}


// 注意我们并不判断 nodeUUID 所指的节点是否真的是一个 :NODE ，其实我们也可以把一个超边当做节点添加到另一个超边里。我们也不检查 hyperEdgeUUID !== nodeUUID
export function connectNodeToHyperedgeAndLetNodeOwnByUser(run, userUUID, hyperEdgeUUID, nodeUUID) {
  return run({
    query: 'MATCH (h:HYPEREDGE {uuid: {hyperEdgeUUID}}), (u:USER {uuid: {userUUID}}), (n {uuid: {nodeUUID}}) CREATE (h)-[r:OWN {uuid: {relationshipUUID1}}]->(n) MERGE (n)<-[r2:OWN]-(u) ON CREATE SET r2.uuid = {relationshipUUID2} RETURN r.uuid',
    params: {
      hyperEdgeUUID,
      userUUID,
      nodeUUID,
      relationshipUUID1: uuid.v4(),
      relationshipUUID2: uuid.v4()
    }
  }).then(createResult => {
    if (createResult === NO_RESULT) { // 只要有一个挂了，就让整个 promise 挂掉
      return Promise.reject(`addHyperEdge Error: MATCH user or CREATE relationship to: ${nodeUUID} failed`);
    }
    return { 'r.uuid': createResult[0].get('r.uuid') };
  });
}


// utils，用来给涉及到添加新超边的函数用
//  addPeriodHyperEdge({run, fsf, userUUID, int: period, timeNow =, hyperEdgeInfo =}) => Promise(string: hyperEdgeUUID)
// 返回一个超边的 UUID，如果时间差大于周期返回的是新的超边的 UUID，不然返回的是以前创建的超边的 UUID
export function addPeriodHyperEdge({ run, fsf, userInfo, period, timeNow = new Date().getTime(), hyperEdgeInfo = { uuid: uuid.v4(), hyperEdgeName: String(timeNow) } }) {
  return typeof(period) !== 'number' || isNaN(period) ? Promise.reject(`addPeriodHyperEdge Error: argument period: ${period} is not a number but ${typeof(period)}`) : run({ // 先用 userInfo 到neo4j里查看他默认要添加到哪个超边里， 开启 transaction
    query: 'MATCH (u:USER {uuid: {userUUID}})-[:OWN]->(h:HYPEREDGE :DEFAULT_HYPEREDGE) RETURN h.createTime, h.uuid',
    params: {
      userUUID: userInfo.uuid
    }
  })
  .then(result => {
    if (result === NO_RESULT) {
      return Promise.reject('addPeriodHyperEdge Error: MATCH things failed');
    }
    // 现在来获取一下上一个默认超边的创建时间和现在时间的差值，比较它和 period- 后面的数字的大小
    if (timeNow - Number(result[0].get('h.createTime')) > period) { // 如果时间差大于周期，那么创建一个新的默认超边
      return fsf.newHyperEdgeDir(hyperEdgeInfo)
        .then(() => fsf.newHyperEdgeXML(hyperEdgeInfo))
        .then(() => run({ // 先用 userInfo 到neo4j里查看他默认要添加到哪个超边里， 开启 transaction
          query: 'MATCH (u:USER {uuid: {userUUID}})-[:OWN]->(hOld:HYPEREDGE :DEFAULT_HYPEREDGE) REMOVE hOld:DEFAULT_HYPEREDGE CREATE (u)-[:OWN {uuid: {relationshipUUID}}]->(h:HYPEREDGE :DEFAULT_HYPEREDGE {uuid:{hyperEdgeUUID}, name:{hyperEdgeName}, createTime:{createTime}, lastUsedTime:{createTime}}) RETURN h.uuid',
          params: {
            userUUID: userInfo.uuid,
            hyperEdgeName: hyperEdgeInfo.hyperEdgeName, // 超边名就用创建时间咯？ 谁有更好的意见？
            hyperEdgeUUID: hyperEdgeInfo.uuid,
            relationshipUUID: uuid.v4(),
            createTime: timeNow
          }
        }));
    }
    // 如果上一个时间点创建的超边应该还能继续用，那就继续用啊
    return Promise.resolve(result);
  });
}


export function addNewNodeOwnsByUserToDefaultHyperEdge(run, userUUID, createTime, nodeUUID) {
  return run({ // 添加到默认超边里，然后修改一下每一个节点的最后使用时间， 开启 transaction
    query: 'MATCH (u:USER {uuid: {userUUID}})-[:OWN]->(h:HYPEREDGE :DEFAULT_HYPEREDGE) CREATE (h)-[r:HAS {uuid: {relationshipUUID1}}]->(n:NODE {uuid: {nodeUUID}, name: "", createTime:{createTime}, lastUsedTime:{createTime}})<-[:OWN {uuid:{relationshipUUID2}}]-(u) SET u.lastUsedTime = {lastUsedTime}, h.lastUsedTime = {lastUsedTime} RETURN h.uuid, n.uuid',
    params: {
      userUUID,
      relationshipUUID1: uuid.v4(),
      relationshipUUID2: uuid.v4(),
      createTime,
      lastUsedTime: createTime,
      nodeUUID
    }
  })
  .then(createResult => createResult === NO_RESULT ? Promise.reject('addBlankNode2DefaultHyperEdge Error: MATCH user or CREATE new node failed') : createResult); // 如果没有结果，那肯定就是出错了
}


export function addNodeOwnsByUserToDefaultHyperEdge(run, userUUID, nodeUUID) {
  return run({ // 添加到默认超边里，然后修改一下每一个节点的最后使用时间
    query: 'MATCH (u:USER {uuid: {userUUID}})-[:OWN]->(h:HYPEREDGE :DEFAULT_HYPEREDGE), (n:NODE {uuid: {nodeUUID}}) CREATE (h)-[r:HAS {uuid: {relationshipUUID}}]->(n) SET u.lastUsedTime = {lastUsedTime}, h.lastUsedTime = {lastUsedTime}, n.lastUsedTime = {lastUsedTime} RETURN h.uuid, n.uuid',
    params: {
      userUUID,
      relationshipUUID: uuid.v4(),
      lastUsedTime: new Date().getTime(),
      nodeUUID
    }
  });
}


export function addNodeOwnsByUserToHyperEdge(run, userUUID, nodeUUID, hyperEdgeUUID) {
  return run({
    query: 'MATCH (u:USER {uuid: {userUUID}})-[:OWN]->(h:HYPEREDGE {uuid: {hyperEdgeUUID}}), (n {uuid: {nodeUUID}}) CREATE (h)-[r:HAS {uuid: {relationshipUUID}}]->(n) SET u.lastUsedTime = {lastUsedTime}, h.lastUsedTime = {lastUsedTime}, n.lastUsedTime = {lastUsedTime} RETURN h.uuid, n.uuid',
    params: {
      userUUID,
      hyperEdgeUUID,
      relationshipUUID: uuid.v4(),
      lastUsedTime: new Date().getTime(),
      nodeUUID
    }
  });
}

export function addOneSiteToNodeThatOwnsByUser(run, userUUID, siteUUID = uuid.v4(), nodeUUID, manualGenerated) {
  return run({
    query: 'MATCH (u:USER {uuid: {userUUID}})-[:OWN]->(n:NODE {uuid: {nodeUUID}}) CREATE (s:SITE {uuid: {siteUUID}, manualGenerated: {manualGenerated}})<-[:HAS]-(u) RETURN s.uuid AS uuid',
    params: {
      userUUID,
      nodeUUID,
      siteUUID,
      manualGenerated
    }
  })
  .then(result => result[0].get('uuid'));
}

/*eslint-disable */
//
// 　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆　　　　　　　◆◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆　　　　　　　◆◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆　　　　　　　◆◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　◆◆◆　　　　　　　　◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆◆◆◆　　　　　　
// 　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆　　　　　　
// 　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　　◆◆◆◆◆◆◆　　　　　　
// 　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆　◆◆◆◆　　　　　　　　◆◆◆　　　◆◆◆◆　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆　　　　　　　　　　　　　　◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆◆　◆◆◆◆　　　　　　　　　◆◆◆◆◆◆　　　　　　　
// 　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　◆◆◆　　　　◆◆◆　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆　　　　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　　　◆◆◆◆◆◆　　　　　　
// 　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　◆◆◆　　　◆◆◆◆　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　◆◆◆◆◆　◆◆◆　　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　　　　◆◆◆◆◆◆　　　　　
// 　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　◆◆◆◆　◆◆◆◆　　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　　◆◆◆　◆◆◆◆　　　　　
// 　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　◆◆◆◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　
// 　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　　◆◆◆◆◆◆◆◆◆　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆　　　　　　　　　　　　　　◆◆◆◆◆◆◆◆　　　　　　　　　　◆◆◆　　　◆◆◆　　　　　　　　　◆◆◆◆◆◆◆　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
// 　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　
/*eslint-enable */
export function commitTransactionOfNeo4jAndFs(run, fsf, returnObject = {}) {
  return run({ query: '' }, false).then(tx =>
    new Promise((resolve, reject) => tx.commit()
    .subscribe({
      onCompleted: () => {
        fsf.commit(() => resolve(returnObject));
      },
      onError: (error) => {
        fsf.rollback(() => reject(error));
      }
    })
    )
  );
}


export function rollbackTransactionOfNeo4jAndFs(run, fsf, error) {
  return run({ query: '' }, false).then(tx =>
      new Promise((resolve, reject) => tx.rollback()
      .subscribe({
        onCompleted: () => {
          fsf.rollback(() => reject(error));
        },
        onError: (rollbackError) => {
          fsf.rollback(() => reject([error, rollbackError]));
        }
      })
      )
    );
}
