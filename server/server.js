import { merge } from 'lodash';
import express from 'express';
import * as bodyParser from "body-parser";
import { apolloExpress, graphiqlExpress } from 'apollo-server';

import { makeExecutableSchema } from 'graphql-tools';
import { typeDefinitions as rootSchema, resolvers as rootResolvers } from './power51Schema';
import Power51Connector from './connectors/Power51Connector';
// Put schema together into one array of schema strings
// and one map of resolvers, like makeExecutableSchema expects
const schema = [...rootSchema];
const resolvers = merge(rootResolvers);

const executableSchema = makeExecutableSchema({
  typeDefs: schema,
  resolvers,
});

import { User, Config, PowerEntity, FortuneCookie } from './models/power51Model';

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

const neo4jUserName = process.env.Neo4jUserName;
const neo4jPassword = process.env.Neo4jPassWord;
const neo4jHost = process.env.Neo4JAuthHost;
const neo4jBoltPort = process.env.Neo4jAuthBoltPort;

const neo4jConnector = new Neo4jConnector({neo4jUserName, neo4jPassword, neo4jHost, neo4jBoltPort});
const serverConnector = new Power51Connector();


const graphQLServer = express();
graphQLServer.use(bodyParser.urlencoded({ extended: true }));
graphQLServer.use(bodyParser.json());
graphQLServer.use(endpointURL, apolloExpress(req => {
    // Get the query, the same way express-graphql does it
  // https://github.com/graphql/express-graphql/blob/3fa6e68582d6d933d37fa9e841da5d2aa39261cd/src/index.js#L257
  const query = req.query.query || req.body.query;
  if (query && query.length > 2000) {
    // None of our app's queries are this long
    // Probably indicates someone trying to send an overly expensive query
    throw new Error('Query too large.');
  }

  return {
    schema: executableSchema,
    context: {
      Config: new Config({ connector: serverConnector }),
      User: new User({ connector: serverConnector }),
      PowerEntity: new PowerEntity({ connector: serverConnector }),
      FortuneCookie: new FortuneCookie(),
    },
  }
}));

graphQLServer.get("/graphiql", graphiqlExpress({endpointURL}));

graphQLServer.listen(GRAPHQL_PORT, () => console.log(
  `GraphQL Server is now running on http://${GRAPHQL_HOST}:${GRAPHQL_PORT}/graphql`
));
