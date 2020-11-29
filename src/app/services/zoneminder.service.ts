import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { PersistenceService } from './persistence.service';

import {
  LoginForm,
  StorageKeys,
  ZmError,
  ZmMonitor,
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
  private loginData: LoginForm;
  public loginRequired: boolean;

  constructor(
    private http: HttpClient,
    private persistenceService: PersistenceService
  ) {
    console.log('Loading ZoneminderService');
    this.init();
  }

  async init() {
    this.loginData = await this.getloginData();
    this.token = await this.getTokens();
    this.loginRequired = !this.loginData || !this.token;
  }

  removeData() {
    this.persistenceService.clear();
  }

  private setloginData(newloginData: LoginForm) {
    this.loginData = newloginData;
    this.persistenceService.set(StorageKeys.LOGIN, newloginData);
  }

  private setToken(newToken: ZmToken) {
    this.token = newToken;
    this.persistenceService.set(StorageKeys.TOKEN, this.token);
  }

  getloginData(): Promise<LoginForm> {
    return this.persistenceService.get(StorageKeys.LOGIN);
  }

  getTokens(): Promise<ZmToken> {
    return this.persistenceService.get(StorageKeys.TOKEN);
  }

  isConnected(): Promise<boolean> {
    return new Promise(async resolve => {
      const loginData = await this.getloginData();
      const tokens = await this.getTokens();
      if (!loginData || !tokens) {
        return resolve(false);
      }
      const isOk = await this.verifyConnection(
        loginData.host,
        tokens.access_token
      );
      if (!isOk) {
        const refreshToken = await this.getRefreshToken(
          loginData,
          tokens.refresh_token
        );
        if (!refreshToken) {
          const newToken = await this.getNewToken(loginData);
          if (!newToken) {
            return resolve(false);
          }
          this.setToken(newToken);
          return resolve(true);
        }
        this.setToken(refreshToken);
        return resolve(true);
      }
      return resolve(true);
    });
  }

  login(loginloginData: LoginForm): Promise<string> {
    return new Promise((resolve, reject) => {
      this.getNewToken(loginloginData)
        .then(newToken => {
          this.setloginData(loginloginData);
          this.setToken(newToken);
          this.loginRequired = !this.loginData || !this.token;
          console.log('Logged ZM: ' + this.token.version);
          resolve();
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
          console.log('Connected ZM: ', checkInfo.version);
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

  private getEnabledMonitors(d: Array<any>): Array<ZmMonitor> {
    const monitors: Array<ZmMonitor> = [];
    for (let i = 0, len = d.length; i < len; i++) {
      monitors.push({
        id: d[i].Monitor.Id,
        name: d[i].Monitor.Name,
        dayEvents: Number(d[i].Monitor.DayEvents) || 0,
        enabled: d[i].Monitor.Enabled === '1' ? true : false,
        function: d[i].Monitor.Function,
        status: d[i].Monitor_Status.Status
      });
    }
    return monitors;
  }

  viewStream(id): string {
    return (
      PREFIX_URL +
      this.loginData.host +
      '/zm/cgi-bin/nph-zms?scale=50&width=640p&height=480px&mode=jpeg&maxfps=5&buffer=1000&&monitor=' +
      id +
      '&token=' +
      this.token.access_token);
  }

  private isTokenExpired(err: string): Promise<boolean> {
    return new Promise(async resolve => {
      if (err === 'Expired token') {
        const refreshToken = await this.getRefreshToken(
          this.loginData,
          this.token.refresh_token
        );
        if (!refreshToken) {
          const newToken = await this.getNewToken(this.loginData);
          if (!newToken) {
            throw new Error('Could not get New Token');
            return resolve(false);
          }
          this.setToken(newToken);
          return resolve(true);
        }
        this.setToken(refreshToken);
        return resolve(true);
      }
      resolve(false);
    });
  }

  private listMonitors(): Promise<any[]> {
    const url =
      PREFIX_URL +
      this.loginData.host +
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
          const tokenExpired = await this.isTokenExpired(zmError.data.name);
          if (tokenExpired) {
            // Try with new Token
            this.listMonitors();
          } else {
            reject(zmError.data.message);
          }
        }
      );
    });
  }

  private getNewToken(loginData: LoginForm): Promise<ZmToken> {
    const url = PREFIX_URL + loginData.host + POSFIX_URL + 'host/login.json';
    const data = {
      user: loginData.user,
      pass: loginData.password
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
    loginData: LoginForm,
    refreshToken: string
  ): Promise<ZmToken> {
    // refresh token
    const url = PREFIX_URL + loginData.host + POSFIX_URL + 'host/login.json';
    const data = {
      user: loginData.user,
      pass: loginData.password,
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
