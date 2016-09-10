import express from 'express';
import { apolloServer } from 'graphql-tools';
import { typeDefinitions, resolvers } from './power51Schema';
import Power51Connector from './connectors/Power51Connector/Power51Connector';
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

const serverConnector = new Power51Connector();

const GRAPHQL_PORT = 8080;

const graphQLServer = express();
graphQLServer.use('/graphql', apolloServer({
  graphiql: true,
  pretty: true,
  schema: typeDefinitions,
  resolvers,
  context: {
    Config: new Config({ connector: serverConnector }),
    User: new User({ connector: serverConnector }),
    PowerEntity: new PowerEntity({ connector: serverConnector }),
    FortuneCookie: new FortuneCookie(),
  },
}));
graphQLServer.listen(GRAPHQL_PORT, () => console.log(
  `GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}/graphql`
));
