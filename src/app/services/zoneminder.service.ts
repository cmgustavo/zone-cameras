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

  constructor(
    private http: HttpClient,
    private persistenceService: PersistenceService
  ) {
    console.log('Loading ZoneminderService');
    this.init();
  }

  async init() {
    this.loginData = await this.getStoredLogin();
    this.token = await this.getStoredToken();
  }

  removeData() {
    this.persistenceService.clear();
  }

  private setLogin(newloginData: LoginForm) {
    this.loginData = newloginData;
    this.persistenceService.set(StorageKeys.LOGIN, newloginData);
  }

  private setToken(newToken: ZmToken) {
    this.token = newToken;
    this.persistenceService.set(StorageKeys.TOKEN, this.token);
  }

  getStoredLogin(): Promise<LoginForm> {
    return this.persistenceService.get(StorageKeys.LOGIN);
  }

  getStoredToken(): Promise<ZmToken> {
    return this.persistenceService.get(StorageKeys.TOKEN);
  }

  isLoggued(): boolean {
    return !!(this.loginData && this.token);
  }

  login(loginData: LoginForm): Promise<string> {
    return new Promise((resolve, reject) => {
      this.getToken(loginData)
        .then(async newToken => {
          console.log('API Version: ' + newToken.apiversion);
          // Verify valid user
          const authorized = await this.isAuthorized(
            loginData.host,
            newToken.access_token
          );
          if (!authorized) {
            return reject('Invalid Username or Password');
          }
          console.log('Connected to ZM Server: ', newToken.version);
          this.setLogin(loginData);
          this.setToken(newToken);
          resolve();
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  getVersion(): Promise<string> {
    const url =
      PREFIX_URL +
      this.loginData.host +
      POSFIX_URL +
      'host/getVersion.json?token=' +
      this.token.access_token;
    return new Promise((resolve, reject) => {
      this.http.get(url).subscribe(
        (checkInfo: ZmVersion) => {
          console.log('Connected ZM: ', checkInfo.version);
          resolve(checkInfo.version);
        },
        async err => {
          const zmError: ZmError = err.error;
          if (!zmError) {
            return reject('Could not connect to ZM Server');
          }
          console.error('Get Version Error: ' + zmError.data.name);
          if (this.isTokenExpired(zmError)) {
            const refreshedToken = await this.refreshToken();
            if (refreshedToken) {
              this.getVersion();
            } else {
              reject(zmError.data.message);
            }
          } else {
            reject(zmError.data.message);
          }
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
      this.token.access_token
    );
  }

  private isTokenExpired(zmError: ZmError): boolean {
    if (!zmError || !zmError.data) {
      return false;
    }
    if (zmError.data.name === 'Expired token') {
      return true;
    } else {
      return false;
    }
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
          if (!zmError) {
            return reject('Could not connect to ZM Server');
          }
          console.error('List Monitors: ' + zmError.data.name);
          if (this.isTokenExpired(zmError)) {
            const refreshedToken = await this.refreshToken();
            if (refreshedToken) {
              setTimeout(() => {
                return this.listMonitors();
              }, 2000);
            } else {
              reject(zmError.data.message);
            }
          } else {
            reject(zmError.data.message);
          }
        }
      );
    });
  }

  private getToken(
    loginData: LoginForm,
    refreshToken?: string
  ): Promise<ZmToken> {
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
    return new Promise((resolve, reject) => {
      this.http.post(url, data, { headers }).subscribe(
        (loginInfo: ZmToken) => {
          resolve(loginInfo);
        },
        err => {
          const zmError: ZmError = err.error;
          if (!zmError) {
            return reject('Could not connect to ZM Server');
          }
          console.error('Get New Token: ' + zmError.data.name);
          reject(zmError.data.message);
        }
      );
    });
  }

  private refreshToken(): Promise<boolean> {
    return new Promise(async resolve => {
      const refreshToken = await this.getToken(
        this.loginData,
        this.token.refresh_token
      );
      if (!refreshToken) {
        const newToken = await this.getToken(this.loginData);
        if (!newToken) {
          throw new Error('Could not get New Token');
          return resolve(false);
        }
        this.setToken(newToken);
        return resolve(true);
      }
      this.setToken(refreshToken);
      return resolve(true);
    });
  }

  private isAuthorized(host: string, token: string): Promise<boolean> {
    const url = PREFIX_URL + host + POSFIX_URL + 'monitors.json?token=' + token;
    return new Promise(resolve => {
      this.http.get(url).subscribe(
        () => {
          resolve(true);
        },
        async err => {
          const zmError: ZmError = err.error;
          if (!zmError) {
            console.error('Could not connect to ZM Server');
            return resolve(false);
          }
          console.error('Authorized Error: ' + zmError.data.name);
          resolve(false);
        }
      );
    });
  }
}
