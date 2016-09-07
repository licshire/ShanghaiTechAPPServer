import Promise from 'bluebird';
import fetch from 'node-fetch';

import {
  USERNAME_USE_BEFORE_SET,
  PASSWORD_USE_BEFORE_SET,
  TOKEN_USE_BEFORE_SET,
  API_FAILURE,
} from './errorTypes';

export class Config {
  constructor({ connector }) {
    this.connector = connector;
    this.platformMetaData = {};
  }

  async getAlarmTypes() {
    try {
      const platformMetaData = await this.connector.get('api/admin/config');
      this.platformMetaData = { ...this.platformMetaData, ...platformMetaData };
      return platformMetaData.alarmTypes;
    } catch (error) {
      throw new Error(error);
    }
  }
}

export class User {
  constructor({ connector }) {
    this.connector = connector;
    this.token = '';
    this.metaData = {};
    this.logined = !!this.token;
  }

  getLoginStatus() {
    return this.logined;
  }

  getUserName() {
    return this.metaData.userName !== undefined
      ? Promise.resolve(this.metaData.userName)
      : Promise.reject(new Error(USERNAME_USE_BEFORE_SET));
  }

  getPassWord() {
    return this.metaData.password !== undefined
      ? Promise.resolve(this.metaData.password)
      : Promise.reject(new Error(PASSWORD_USE_BEFORE_SET));
  }

  getToken(token) {
    return this.token !== undefined
      ? Promise.resolve(this.token)
      : Promise.reject(new Error(TOKEN_USE_BEFORE_SET));
  }

  async login(username, password) {
    this.metaData = { ...this.metaData, username, password };

    try {
      const { token, metaData, error } = await this.connector.login(username, password);
      this.token = token;
      this.metaData = { ...this.metaData, ...metaData };
      this.logined = true;
      return { token };
    } catch (error) {
      return { error };
    }
  }

  isLogined() {
    return this.connector.getLoginStatus();
  }

  getUserName() {
    return this.connector.getUserName();
  }

  getPassWord() {
    return this.connector.getPassWord();
  }
}

export class FortuneCookie {
  async getFortuneCookie() {
    try {
      const response = await fetch('http://fortunecookieapi.com/v1/cookie');
      const [{ fortune: { message: fortuneCookie } }] = await response.json();
      return fortuneCookie;
    } catch (error) {
      return error.toString();
    }
  }
}