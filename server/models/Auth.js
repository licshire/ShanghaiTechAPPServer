import Promise from 'bluebird';
import fetch from 'node-fetch';
import _ from 'lodash';
import moment from 'moment';
import sha512 from 'js-sha512';

import {
  API_FAILURE,
} from '../constants/errorTypes';



function addSalt(aString, ...salt) {
  return salt.reduce((previous, current) => sha512(previous + current), aString);
}

export class Auth {
  memcachedConnector: Object;
  neo4jConnector: Object;

  constructor({ memcachedConnector, neo4jConnector }) {
    this.memcachedConnector = memcachedConnector;
    this.neo4jConnector = neo4jConnector;
  }

  async login({fortuneCookie, userName, passWord: saltedPassWordFromClient}) {
    const { passWord, uuid } = await this.neo4jConnector.getPropertiesByUniqueProperty({label: ['USER'], property: {userName}});

    // 客户端依次用旧新两个 FortuneCookie 对密码加盐摘要后和账号、FortuneCookie 一起返回给服务器，服务器检查账号这个 key 下的 FortuneCookie 是否与传来的相对应
    const fortuneCookieFromCache = await this.memcachedConnector.getMemcachedString(userName);
    if (fortuneCookieFromCache === null) {
      return new Error('login-failed login() fortuneCookie expired, we have been waiting for too long');      
    }
    if (fortuneCookieFromCache.toString() !== fortuneCookie) {
      return new Error('login-failed login() you sent fortuneCookie differ from what you got');
    }

    // 服务器检查旧密码在用新 FortuneCookie 加盐摘要后是否和传来的摘要相等 服务器存储新的摘要并返回登录成功 token
    const newSaltedPassWord = addSalt(passWord, fortuneCookie);
    if (newSaltedPassWord !== saltedPassWordFromClient) {
      return new Error('login-failed login() passWord wrong, but you should check were there any typo on userName');
    }
    await this.neo4jConnector.updatePropertyByUUID({ uuid, properties: { passWord: newSaltedPassWord, fortuneCookie } })

    const momentNow = moment().format('YYYY-MM-DD HH:mm:ss');
    return addSalt(fortuneCookie, userName, momentNow);
  }

  // 用户输入账号密码后，点击「登录」用账号向服务器请求 FortuneCookie
  // 返回一个 fortuneCookie 并将这个 fortuneCookie 以 username 为键存入 memcache
  async getNewFortuneCookie(userName: string) {
    try {
      const response = await fetch('http://fortunecookieapi.com/v1/cookie');
      const [{ fortune: { message: fortuneCookie } }] = await response.json();
      this.memcachedConnector.setMemcached(userName, fortuneCookie, 300);
      return fortuneCookie;
    } catch (error) {
      return error.toString();
    }
  }

  // 从 neo4j 中取出用户上一个 fortuneCookie
  async getOldFortuneCookie(userName: string) {
    try {
      const { fortuneCookie } = await this.neo4jConnector.getPropertiesByUniqueProperty({label: ['USER'], property: {userName}});
      return fortuneCookie;
    } catch (error) {
      return error.toString();
    }
  }
}

