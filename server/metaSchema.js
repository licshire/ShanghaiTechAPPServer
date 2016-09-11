export const typeDefinitions = [`schema {
  query: RootQuery
  mutation: RootMutation
}

type RootMutation {
  createMemePath(title: String!, description: String): MemePathType!
  createStringMeme(title: String!, description: String, content: String, mimeType: String!, memePathUUID: String!): StringMemeType!
}

type MemePathType {
  title: String!
  description: String!

  createTime: String
  updateTime: String
  uuid: String
}

type StringMemeType {
  title: String!
  description: String!
  uri: String!
  mimeType: String!
  content: String!

  createTime: String
  updateTime: String
  uuid: String
}

type RootQuery {
  memePath(uuid: String!): MemePathType
  meme(uuid: String!): StringMemeType
}

`];

type StringMemeType = {
  uuid: string,
  title: string,
  description: string,
  mimeType: string,
  uri: string,
  createTime: string,
  updateTime: string,
  memePathUUID: string
};

import { property, isEmpty } from 'lodash';
import fetch from 'node-fetch';

export const resolvers = {
  RootMutation: {
    createMemePath(root, { title, description }, context) {
      return context.KnowledgeGraph.createMemePath({ title, description });
    },
    async createStringMeme(root, { title, description, content, mimeType, memePathUUID }, context) {
      const result: StringMemeType = await context.KnowledgeGraph.createStringMeme({
        title, description, content, mimeType, memePathUUID
      });
      return result;
    },
  },
  RootQuery: {
    memePath(root, { uuid }, context) {
      return context.KnowledgeGraph.getMemePath(uuid);
    },
    meme(root, { uuid }, context) {
      return context.KnowledgeGraph.getMeme(uuid);
    },
  },
  MemePathType: {
    title: property('title'),
    description: property('description'),
    createTime: property('createTime'),
    updateTime: property('updateTime'),
    uuid: property('uuid'),
  },
  StringMemeType: {
    title: property('title'),
    description: property('description'),
    uri: property('uri'),
    mimeType: property('mimeType'),
    content({ uri }, args, context) {
      const FILE_PORT = process.env.FilePort;
      const FILE_HOST = process.env.FileHost;
      const url = `http://${FILE_HOST}:${FILE_PORT}/${uri}`;
      return fetch(url).then(res => res.text());
    },
    createTime: property('createTime'),
    updateTime: property('updateTime'),
    uuid: property('uuid'),
  }
}
