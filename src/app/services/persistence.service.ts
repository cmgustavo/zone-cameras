import { Injectable } from '@angular/core';

import { Plugins } from '@capacitor/core';

const { Storage } = Plugins;

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
  constructor() {
    console.log('Loading PersistenceService');
  }

  async set(key: string, data: any) {
    let value;
    try {
      value = JSON.stringify(data);
    } catch (e) {
      console.error('Invalid data');
      throw new Error(e);
    }
    await Storage.set({
      key,
      value
    });
  }

  async get(key: string) {
    const { value } = await Storage.get({ key });
    return JSON.parse(value);
  }

  async remove(key: string) {
    await Storage.remove({ key });
    console.log('Removed: ', key);
  }

  async keys() {
    const { keys } = await Storage.keys();
    console.log('Got keys: ', keys);
  }

  async clear() {
    await Storage.clear();
    console.log('Wiped all data');
  }
}
