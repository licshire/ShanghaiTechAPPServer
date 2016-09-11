import { merge } from 'lodash';

import TransactionFSConnector from './connectors/TransactionFSConnector';
import Neo4jConnector from './connectors/HyperNeo4jConnector';

import { ShanghaiTechKnowledgeGraph } from './models/ShanghaiTechKnowledgeGraph';

const fs = require('fs');
const babelrc = fs.readFileSync('./.babelrc');
let config;

try {
  config = JSON.parse(babelrc);
} catch (err) {
  console.error('==>     ERROR: Error parsing your .babelrc.');
  console.error(err);
}
require('babel-register')(config);




const neo4jUserName = process.env.Neo4jUserName;
const neo4jPassword = process.env.Neo4jPassWord;
const neo4jHost = process.env.Neo4JMetaHost;
const neo4jBoltPort = process.env.Neo4jMetaBoltPort;

const neo4jConnector = new Neo4jConnector({neo4jUserName, neo4jPassword, neo4jHost, neo4jBoltPort});
const transactionFSConnector = new TransactionFSConnector(process.env.FileBasePath);


const KnowledgeGraph = new ShanghaiTechKnowledgeGraph({ DBConnector: neo4jConnector, FSConnector: transactionFSConnector })

const officalNewsUUID = 'd537c9cd-f842-4441-86fe-bb866fcbb85c';

