import Promise from 'bluebird';
import fetch from 'node-fetch';
import _ from 'lodash';
import moment from 'moment';

import {
  USERNAME_USE_BEFORE_SET,
  PASSWORD_USE_BEFORE_SET,
  TOKEN_USE_BEFORE_SET,
  USERMETA_USE_BEFORE_SET,
  API_FAILURE,
  MODEL_DONT_HAVE_THIS_FIELD,
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
    this.username = {};
    this.password = {};
    this.metaData = {};
  }

  async getLoginStatus(token) {
    try {
      const meta = await this.getAllMetaData();
      return true;
    } catch (error) {
      return false;
    }
  }

  getUserName(token) {
    return !!this.userName[token]
      ? Promise.resolve(this.userName[token])
      : Promise.reject(new Error(USERNAME_USE_BEFORE_SET));
  }

  getPassWord(token) {
    return !!this.password[token]
      ? Promise.resolve(this.password[token])
      : Promise.reject(new Error(PASSWORD_USE_BEFORE_SET));
  }

  async getAllMetaData(token) {

    const metaData = await this.connector.get('/api/account/whoami', token);
    this.metaData[token] = metaData;

    return this.metaData[token];
  }

  getMetaData(field, token) {
    return this.getAllMetaData(token)
      .then(meta => _.has(meta, field) ? meta[field] : Promise.reject(new Error(MODEL_DONT_HAVE_THIS_FIELD + ' : ' + field)));
  }

  async login(username, password) {
    try {
      const { token, error } = await this.connector.login(username, password);

      this.username[token] = username;
      this.password[token] = password;

      const { metaData } = await this.connector.get('/api/account/whoami', token);
      this.metaData[token] = metaData;

      return { token };
    } catch (error) {
      return { error };
    }
  }
}


export class PowerEntity {
  constructor({ connector }) {
    this.connector = connector;
    this.districts = {};
    this.siteInfos = {};
    this.modules = {};
  }

  async getAllDistrictData(token) {
    const districtsDatas: Array<Object> = await this.connector.get('/api/info/entry', token);

    return districtsDatas;
  }

  getCompanyPie(token) {
    return this.connector.get('/api/data/index/pie', token);
  }

  getCompanyAlarm(token, pageIndex = 1, orderBy = 'time', fromTime = '', toTime = '', alarmCode = '', pageSize = 20) {
    return this.connector.get(`/api/alarm/company?pz=${pageSize}&pi=${pageIndex}&ob=${orderBy}&ft=${fromTime}&tt=${toTime}&ac=${alarmCode}`, token);
  }

  getCompanyAlarmUnread(token): Promise<number> {
    return this.connector.get('/api/alarm/unread_quantity', token)
      .then(obj => obj.count);
  }

  getDistrictPie(districtID, token) {
    return this.connector.get(`/api/data/district/${districtID}/pie`, token);
  }

  async getAllSiteOverview(siteID, token) {
    const { infos, wires } = await this.connector.get(`/api/data/site/${siteID}/overview`, token);
    return { infos, wires };
  }

  getSitePie(siteID, token) {
    return this.connector.get(`/api/data/site/${siteID}/pie`, token);
  }

  getSiteAlarm(siteID, token, pageIndex = 1, orderBy = 'time', fromTime = '', toTime = '', alarmCode = '', pageSize = 20) {
    return this.connector.get(`/api/alarm/site/${siteID}?pz=${pageSize}&pi=${pageIndex}&ob=${orderBy}&ft=${fromTime}&tt=${toTime}&ac=${alarmCode}`, token);
  }

  getSiteAlarmUnreadAmount(siteID, token): Promise<number> {
    return this.connector.get(`/api/alarm/unread_quantity/site/${siteID}`, token)
      .then(obj => obj.count);
  }

  getSiteInfos(siteID, token) {
    return this.getAllSiteOverview(siteID, token)
      .then(obj => obj.infos);
  }

  getWires(siteID, token) {
    return this.getAllSiteOverview(siteID, token)
      .then(obj => obj.wires);
  }

  getCabinets(siteID, token) {
    return this.connector.get(`/api/info/site/${siteID}/cabinets`, token);
  }

  getSwitches(siteID, token) {
    return this.connector.get(`/api/data/site/${siteID}/cabinets/switches`, token)
      .then(list => list.map(cabinet => cabinet.switches));
  }

  getRealtimeData(deviceID, token) {
    return this.connector.get(`/api/data/device/${deviceID}/realtime`, token)
  }

  getDeviceAlarm(deviceID, token, pageIndex = 1, orderBy = 'time', fromTime = '', toTime = '', alarmCode = '', pageSize = 20) {
    return this.connector.get(`/api/alarm/device/${deviceID}?pz=${pageSize}&pi=${pageIndex}&ob=${orderBy}&ft=${fromTime}&tt=${toTime}&ac=${alarmCode}`, token);
  }

  getChildren(areaType, id, token) {
    switch (areaType) {
      case 'Company':
        return this.getAllDistrictData(token);
      case 'District':
        return this.getAllDistrictData(token)
          .then(districts => _.findIndex(districts, obj => obj.id === id));
      case 'Site':
        return this.getCabinets(token);
      default:
        return [];
    }
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
