export const typeDefinitions = [`schema {
  query: RootQuery
  mutation: RootMutation
}

type RootMutation {
  auth(fortuneCookie: String!, userName: String!, passWord: String!): TokenType!
}

type TokenType {
  token: String!
}

type RootQuery {
  FortuneCookie(userName: String!): AuthFortuneCookieType
}

type AuthFortuneCookieType {
  oldFortuneCookie: String!
  newFortuneCookie: String!
}
`];


import { property, isEmpty } from 'lodash';

export const resolvers = {
  RootMutation: {
    auth(root, { fortuneCookie, userName, passWord }, context) {
      return { token: context.Auth.login({fortuneCookie, userName, passWord}) };
    },
  },
  RootQuery: {
    FortuneCookie(root, { userName }, context) {
      return { 
        oldFortuneCookie: context.Auth.getOldFortuneCookie(userName),
        newFortuneCookie: context.Auth.getNewFortuneCookie(userName),
      };
    },
  },
  AuthFortuneCookieType: {
    oldFortuneCookie: property('oldFortuneCookie'),
    newFortuneCookie: property('newFortuneCookie'),
  },
  TokenType: {
    token: property('token'),
  }
}