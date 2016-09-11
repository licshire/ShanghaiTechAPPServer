import { merge } from 'lodash';
import express from 'express';
import * as bodyParser from "body-parser";

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
const FILE_PORT = process.env.FilePort;
const FILE_HOST = process.env.FileHost; // 仅作显示之用，要改变这个还是得用 nginx 反代出去

const FILE_PATH = process.env.FileBasePath;


const FileServer = express();
FileServer.use(express.static(FILE_PATH));

FileServer.listen(FILE_PORT, () => console.log(
  `FileServer is now running on http://${FILE_HOST}:${FILE_PORT}`
));
