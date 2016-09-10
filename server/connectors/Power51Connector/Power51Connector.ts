import Promise from 'bluebird';
import fetch from 'node-fetch';

import {
  API_FAILURE,
  NO_TOKEN,
} from './errorTypes';


const POWER51PATH = 'http://power51.grootapp.com:31328';


function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }

  const error = new Error(response.statusText);
  error.response = response;
  return Promise.reject(API_FAILURE + error.toString());
}




export default class Power51Connector {
  login(username, password) {
    return Promise.try(() =>
      fetch(`${POWER51PATH}/api/account/login_app`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })
    )
      .then(checkStatus)
      .then(response => response.json())
      .then(json => {
        if (json.code !== 0) {
          return Promise.reject(json.message);
        }
        return { token: json.token, metaData: json.data };
      });
  }

  logout() { // 实际上服务端并没有做 logout，每次登陆生成的 token 都会保存 7天
  }

  get(route, token) {
    const tokenWithPrefix = `${/\?/.test(route) ? '&' : '?'}token=${token}`;
    return Promise.try(() =>
      fetch(`${POWER51PATH}/${route}${tokenWithPrefix}`, {
        method: 'GET',
        headers: {},
      })
    )
      .then(checkStatus)
      .then(response => response.json())
      .then(json => {
        if (json.code !== 0) {
          return Promise.reject(json.message);
        }
        return json.data;
      });
  }

  post(route, data, token) {
    return Promise.try(() =>
      fetch(`${POWER51PATH}/${route}?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      })
    )
      .then(checkStatus)
      .then(response => response.json())
      .then(json => {
        if (json.code !== 0) {
          return Promise.reject(json.message);
        }
        return json.data;
      });
  }
}
