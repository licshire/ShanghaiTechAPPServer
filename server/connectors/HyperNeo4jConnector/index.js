import { size } from 'lodash';
import { v1 as neo4j } from 'neo4j-driver';

import url from 'url';
import { v4 as isuuid } from 'is-uuid';
import { v4 as uuid } from 'node-uuid';

import Promise from "bluebird";

type UserInfoType = {
  neo4jUserName: string,
  neo4jPassword: string,
  neo4jHost: string,
  neo4jBoltPort: string
};

export default class HyperNeo4jConnector {

  constructor({ neo4jUserName, neo4jPassword, neo4jHost, neo4jBoltPort }: UserInfoType) {
    this.driver = neo4j.driver(
      url.format({ protocol: 'bolt', slashes: true, hostname: neo4jHost, port: neo4jBoltPort }),
      neo4j.auth.basic(neo4jUserName, neo4jPassword),
      { encrypted: true, trust: 'TRUST_ON_FIRST_USE' }
    );
  }

  commit(session, onSuccess: Function = () => { }, onFail: Function = () => { }): Promise<> {
    return new Promise((resolve, reject) => {
      if (!session) {
        return reject('session-dont-exist at HyperNeo4jConnector.commit, maybe previous function delete the session')
      }
      this.session.commit()
        .subscribe({
          onCompleted: () => {
            onSuccess(resolve());
          },
          onError: (error) => {
            onFail(reject(`neo4j-commit-fail ${error} at HyperNeo4jConnector.commit`));
          }
        });
    });
  }

  // todo: 搞一个transaction装饰器
  // isTransaction(transactionSession) {
  //   let isTransaction = false;
  //   let session;
  //   if (transactionSession) {
  //     isTransaction = true;
  //     session = transactionSession;
  //     return { session, isTransaction };
  //   }
  //   session = this.driver.session();
  //   return { session: session.beginTransaction(), isTransaction, originalSession: session };
  // }

  // todo: 检查传入的是不是没有括号等特殊符号 还有property目前默认都是String，还有可能是数字呢
  getPropertiesByUniqueProperty({labels, properties, session: transactionSession}) {
    // const { session, isTransaction, originalSession } = this.isTransaction(transactionSession);
    const session = this.driver.session();
    let labelsString = '';
    if (labels && typeof labels === 'string') {
      labelsString = ':' + labels.join(':');
    }

    let propertiesString = '';
    if (size(properties) !== 0 && typeof properties === 'object') {
      propertiesString = '{';
      let count = 1;
      for (const key in properties) {
        propertiesString = `${propertiesString} ${key}: "${properties[key]}"`;
        if (count < size(properties)) {
          propertiesString += ', ';
          count++;
        }
      }
      propertiesString += ' }';
    }

    return session.run(`MATCH (n ${labelsString} ${propertiesString}) RETURN n`)
      .then((result) => {
        if (result.records.length > 1) {
          return Promise.reject('database-restrict-broken getNodeByUniqueProperty() got more than one result')
        } else if (result.records.length === 0) {
          return {};
        }

        session.close();
        return result.records[0].get('n').properties;
      })
  }


  updatePropertyByUUID({uuid, properties}) {
    const session = this.driver.session();

    let propertiesString = '';
    if (size(properties) !== 0 && typeof properties === 'object') {
      propertiesString = ' SET';
      let count = 1;
      for (const key in properties) {
        propertiesString = `${propertiesString} n.${key} = "${properties[key]}"`;
        if (count < size(properties)) {
          propertiesString += ',';
          count++;
        }
      }
      propertiesString += ' ';
    }

    return session.run(`MATCH (n { uuid: "${uuid}"}) ${propertiesString} RETURN n`)
      .then((result) => {
        if (result.records.length > 1) {
          return Promise.reject('database-restrict-broken updatePropertyByUUID() got more than one result');
        } else if (result.records.length === 0) {
          return Promise.reject('bad-parameter-for-database updatePropertyByUUID() got no result, probably providing unexisted uuid?');
        }

        session.close();
        return result.records[0].get('n').properties;
      })
  }
}
