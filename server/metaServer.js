import { merge } from 'lodash';
import express from 'express';
import * as bodyParser from "body-parser";
import { apolloExpress, graphiqlExpress } from 'apollo-server';

import { makeExecutableSchema } from 'graphql-tools';
import { typeDefinitions as rootSchema, resolvers as rootResolvers } from './metaSchema';
import TransactionFSConnector from './connectors/TransactionFSConnector';
import Neo4jConnector from './connectors/HyperNeo4jConnector';
// Put schema together into one array of schema strings
// and one map of resolvers, like makeExecutableSchema expects
const schema = [...rootSchema];
const resolvers = merge(rootResolvers);

const executableSchema = makeExecutableSchema({
  typeDefs: schema,
  resolvers,
});

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


const endpointURL = "/grahpql";
const GRAPHQL_PORT = process.env.GraphQLPort;
const GRAPHQL_HOST = process.env.GraphQLHost; // 仅作显示之用，要改变这个还是得用 nginx 反代出去

const FILE_PORT = process.env.FilePort;
const FILE_HOST = process.env.FileHost;

const neo4jUserName = process.env.Neo4jUserName;
const neo4jPassword = process.env.Neo4jPassWord;
const neo4jHost = process.env.Neo4JMetaHost;
const neo4jBoltPort = process.env.Neo4jMetaBoltPort;

const neo4jConnector = new Neo4jConnector({neo4jUserName, neo4jPassword, neo4jHost, neo4jBoltPort});
const transactionFSConnector = new TransactionFSConnector(process.env.FileBasePath);


const graphQLServer = express();
graphQLServer.use(bodyParser.urlencoded({ extended: true }));
graphQLServer.use(bodyParser.json());
graphQLServer.use(endpointURL, apolloExpress(req => {
  return {
    schema: executableSchema,
    context: {
      KnowledgeGraph: new ShanghaiTechKnowledgeGraph({ DBConnector: neo4jConnector, FSConnector: transactionFSConnector })
    },
  }
}));

graphQLServer.get("/graphiql", graphiqlExpress({endpointURL}));

graphQLServer.listen(GRAPHQL_PORT, () => console.log(
  `GraphQL Server is now running on http://${GRAPHQL_HOST}:${GRAPHQL_PORT}/graphql`
));
