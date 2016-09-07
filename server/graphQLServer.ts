// instantiate PrettyError, which can then be used to automatically render all error objects
import PrettyError from 'pretty-error';
const pretty = new PrettyError();
pretty.start();


import { makeExecutableSchema } from 'graphql-tools';
import { typeDefinitions, resolvers } from './schema';
const executableSchema = makeExecutableSchema({
  typeDefs: typeDefinitions,
  resolvers,
});

import ShanghaiTechKnowledgeGraph from './models/ShanghaiTechKnowledgeGraph';
import HyperNeo4jConnector from './connectors/HyperNeo4jConnector';
import TransactionFSConnector from './connectors/TransactionFSConnector';

import * as express from 'express';
import * as bodyParser from 'body-parser';

import { apolloExpress, graphiqlExpress } from 'apollo-server';

const GRAPHQL_HOST = process.env.GraphQL_Host || 'localhost';
const GRAPHQL_PORT = process.env.GraphQLPort || 8964;

const app = express();
app.use('/graphql', bodyParser.json(), apolloExpress((req) => {
  const query = req.query.query || req.body.query;
  if (query && query.length > 2000) {
    // None of our app's queries are this long
    // Probably indicates someone trying to send an overly expensive query
    throw new Error('Query too large.');
  }

  let user: {userName?: string, userUUID?: string} = {};
  if (req.user) {
    // 如果有登陆信息的话，不然就算了，userUUID 应该会自动生成新的
    user = {
      userName: req.user.name,
      userUUID: req.user.UUID
    };
  }

  const HyperNeo4jConnector = new HyperNeo4jConnector({
    userUUID: user.userUUID,
    neo4jUserName: 'neo4j',

  });

  return {
    schema: executableSchema,
    context: {
      user,
      ShanghaiTechKnowledgeGraph: new ShanghaiTechKnowledgeGraph({ DBConnector: HyperNeo4jConnector, FSConnector: TransactionFSConnector })
    },
  };
}));

app.use('/graphiql', graphiqlExpress({
  endpointURL: '/graphql',
}));

app.listen(GRAPHQL_PORT, () => console.log( // eslint-disable-line no-console
  `Server is now running on http://localhost:${GRAPHQL_PORT}`
));
