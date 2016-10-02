import { merge } from 'lodash';
import Promise from 'bluebird';
import h2m from 'h2m';
import path from 'path';
import fetch from 'node-fetch';

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


const FILE_PATH = process.env.FileBasePath;

const neo4jUserName = process.env.Neo4jUserName;
const neo4jPassword = process.env.Neo4jPassWord;
const neo4jHost = process.env.Neo4JMetaHost;
const neo4jBoltPort = process.env.Neo4jMetaBoltPort;

const neo4jConnector = new Neo4jConnector({ neo4jUserName, neo4jPassword, neo4jHost, neo4jBoltPort });
const transactionFSConnector = new TransactionFSConnector(process.env.FileBasePath);


const KnowledgeGraph = new ShanghaiTechKnowledgeGraph({ DBConnector: neo4jConnector, FSConnector: transactionFSConnector })

const officalNewsUUID = 'd537c9cd-f842-4441-86fe-bb866fcbb85c';




function getAllFile(root) {
  const files = fs.readdirSync(root);
  files.forEach(function (file) {
    const thisFile = h2m(fs.readFileSync(path.join(root, file)).toString());
    const title = thisFile.split('\n')[0];
    console.log('creating ', title);
    return Promise.delay(100).then(() => KnowledgeGraph.createStringMeme({
      title, description: '',
      content: thisFile,
      mimeType: 'text/markdown',
      memePathUUID: officalNewsUUID
    }))
    // await fetch(`http://localhost:8964/graphiql?query=mutation%20addmemepath%20%7B%0A%20%20createStringMeme(title%3A%20"${title}"%2C%20description%3A%20"somehowtestit"%2C%20content%3A%20"${thisFile}"%2CmimeType%3A%20"text%2Fmarkdown"%2C%20memePathUUID%3A%20"d537c9cd-f842-4441-86fe-bb866fcbb85c")%20%7B%0A%20%20%20%20title%0A%20%20%20%20description%0A%20%20%20%20createTime%0A%20%20%20%20updateTime%0A%20%20%20%20uuid%0A%20%20%7D%0A%7D&operationName=addmemepath`)
  });
}


getAllFile('../校网信息/cathedra');
// getAllFile('../校网信息/news');
// getAllFile('../校网信息/prof/bio');
// getAllFile('../校网信息/prof/physical');
// getAllFile('../校网信息/prof/sem');
// getAllFile('../校网信息/prof/sist');

// mutation aaa {
//   createMemePath(title: "上科大官网", description: "上科大官方新闻、教授介绍") {
//     title
//     description
//     createTime
//     updateTime
//     uuid
//   }
// }