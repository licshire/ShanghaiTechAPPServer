// @flow
import { v1 as neo4j } from 'neo4j-driver';
import './hyperNeo4jAPI';

import url from 'url';
import { v4 as isuuid } from 'is-uuid';
import { v4 as uuid } from 'node-uuid';

import Promise from "bluebird";

type userInfo = {
  neo4jUserName: string,
  neo4jPassword: string,
  neo4jHost: string,
  neo4jBoltPort: number,
  userUUID: ?string
};

type returnObject = {
  success: boolean,
  reason: string
};

export default class HyperNeo4jConnector {
  driver: Driver;
  session: ?Neo4jSession;
  userUUID: string;
  constructor({ neo4jUserName, neo4jPassword, neo4jHost, neo4jBoltPort, userUUID }: userInfo) {

    this.driver = neo4j.driver(
      url.format({protocol: 'bolt', slashes: true, hostname: neo4jHost, port: neo4jBoltPort}),
      neo4j.auth.basic(neo4jUserName, neo4jPassword),
      { encrypted: true, trust: 'TRUST_ON_FIRST_USE' }
    );
    // $FlowFine: flow dont understan what isuuid() does
    this.userUUID = isuuid(userUUID) ? userUUID : uuid();

  }

  commit(onSuccess: Function = () => {}, onFail: Function = () => {}): Promise<returnObject> {
    return new Promise((resolve, reject) => {
      if (!this.session) {
        return reject({success: false, reason: 'session-dont-exist at HyperNeo4jConnector.commit, maybe previous function delete the session'})
      }
      this.session.commit()
      .subscribe({
        onCompleted: () => {
          onSuccess(resolve({success: true}));
        },
        onError: (error) => {
          onFail(reject({success: false, reason: `neo4j-commit-fail ${error} at HyperNeo4jConnector.commit`}));
        }
      });
    });
  }

  addHyperEdge(): Promise<returnObject> {
    const session = this.session || this.driver.session().beginTransaction();
  }
}
