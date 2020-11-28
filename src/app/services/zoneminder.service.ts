import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { PersistenceService } from './persistence.service';

import {
  LoginForm,
  StorageKeys,
  ZmError,
  ZmToken,
  ZmVersion
} from './services.types';

const PREFIX_URL = 'https://';
const POSFIX_URL = '/zm/api/';

@Injectable({
  providedIn: 'root'
})
export class ZoneminderService {
  private token: ZmToken;
  private credentials: LoginForm;
  public monitors;

  constructor(
    private http: HttpClient,
    private persistenceService: PersistenceService
  ) {
    console.log('Loading ZoneminderService');
  }

  removeData() {
    this.persistenceService.clear();
  }

  private setCredentials(newCredentials: LoginForm) {
    this.credentials = newCredentials;
    this.persistenceService.set(StorageKeys.CREDENTIALS, newCredentials);
  }

  private setToken(newToken: ZmToken) {
    this.token = newToken;
    this.persistenceService.set(StorageKeys.TOKEN, this.token);
  }

  getCredentials(): Promise<LoginForm> {
    return this.persistenceService.get(StorageKeys.CREDENTIALS);
  }

  getTokens(): Promise<ZmToken> {
    return this.persistenceService.get(StorageKeys.TOKEN);
  }

  isConnected(): Promise<boolean> {
    return new Promise(async resolve => {
      const credentials = await this.getCredentials();
      const tokens = await this.getTokens();
      if (!credentials || !tokens) {
        return resolve(false);
      }
      this.credentials = credentials;
      const isOk = await this.verifyConnection(
        credentials.host,
        tokens.access_token
      );
      if (!isOk) {
        const refreshToken = await this.getRefreshToken(
          credentials,
          tokens.refresh_token
        );
        if (!refreshToken) {
          const newToken = await this.getNewToken(credentials);
          if (!newToken) {
            return resolve(false);
          }
          this.setToken(newToken);
          return resolve(true);
        }
        this.setToken(refreshToken);
        return resolve(true);
      }
      this.token = tokens;
      return resolve(true);
    });
  }

  login(loginCredentials: LoginForm): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.getNewToken(loginCredentials)
        .then(newToken => {
          this.setCredentials(loginCredentials);
          this.setToken(newToken);
          resolve(true);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  private verifyConnection(
    host: string,
    accessToken: string
  ): Promise<boolean> {
    const url =
      PREFIX_URL +
      host +
      POSFIX_URL +
      'host/getVersion.json?token=' +
      accessToken;
    return new Promise((resolve, reject) => {
      this.http.get(url).subscribe(
        (checkInfo: ZmVersion) => {
          console.log('ZoneMinder Version: ', checkInfo.version);
          resolve(true);
        },
        err => {
          const zmError: ZmError = err.error;
          console.error(zmError.data.message);
          resolve(false);
        }
      );
    });
  }

  getMonitors(): Promise<any[]> {
    return this.listMonitors();
  }

  getEnabledMonitors(d: Array<any>): Array<any> {
    const monitors = [];
    for (let i = 0, len = d.length; i < len; i++) {
      monitors.push({
        id: d[i].Monitor.Id,
        name: d[i].Monitor.Name,
        status: d[i].Monitor_Status.Status
      });
    }
    return monitors;
  }

  viewStream(id): string {
    return (
      PREFIX_URL +
      this.credentials.host +
      '/zm/cgi-bin/nph-zms?scale=50&width=640p&height=480px&mode=jpeg&maxfps=5&buffer=1000&&monitor=' +
      id +
      '&token=' +
      this.token.access_token +
      '&connkey=36139'
    );
  }

  private isNewToken(err: string): Promise<boolean> {
    return new Promise(async resolve => {
      if (err === 'Expired token') {
        const newToken = await this.getRefreshToken(
          this.credentials,
          this.token.refresh_token
        );
        this.setToken(newToken);
        return resolve(true);
      }
      resolve(false);
    });
  }

  private listMonitors(): Promise<any[]> {
    const url =
      PREFIX_URL +
      this.credentials.host +
      POSFIX_URL +
      'monitors.json?token=' +
      this.token.access_token;
    return new Promise((resolve, reject) => {
      this.http.get(url).subscribe(
        (dataMonitors: any) => {
          resolve(this.getEnabledMonitors(dataMonitors.monitors));
        },
        async err => {
          const zmError: ZmError = err.error;
          console.error('List Monitors: ' + zmError.data.name);
          const doRefresh = await this.isNewToken(zmError.data.name);
          if (doRefresh) {
            this.listMonitors();
          } else {
            reject(zmError.data.message);
          }
        }
      );
    });
  }

  private getNewToken(credentials: LoginForm): Promise<ZmToken> {
    const url = PREFIX_URL + credentials.host + POSFIX_URL + 'host/login.json';
    const data = {
      user: credentials.user,
      pass: credentials.password
    };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json'
    });
    return new Promise((resolve, reject) => {
      this.http.post(url, data, { headers }).subscribe(
        (loginInfo: ZmToken) => {
          resolve(loginInfo);
        },
        err => {
          const zmError: ZmError = err.error;
          console.error('Get New Token: ' + zmError.data.name);
          reject(zmError.data.message);
        }
      );
    });
  }

  private getRefreshToken(
    credentials: LoginForm,
    refreshToken: string
  ): Promise<ZmToken> {
    // refresh token
    const url = PREFIX_URL + credentials.host + POSFIX_URL + 'host/login.json';
    const data = {
      user: credentials.user,
      pass: credentials.password,
      refresh_token: refreshToken
    };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json'
    });
    return new Promise(resolve => {
      this.http.post(url, data, { headers }).subscribe(
        (loginInfo: ZmToken) => {
          resolve(loginInfo);
        },
        err => {
          const zmError: ZmError = err.error;
          console.error('Get Refresh Token: ' + zmError.data.name);
          console.error(zmError.data.message);
        }
      );
    });
  }
}
