import { Component } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';

import { ZoneminderService } from '../services/zoneminder.service';

import { LoginForm, ZmMonitor } from '../services/services.types';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage {
  public showForm: boolean;
  public loginForm: LoginForm = {
    host: '',
    user: '',
    password: ''
  };

  public monitors;

  constructor(
    private zmService: ZoneminderService,
    public alertController: AlertController,
    public navCtrl: NavController
  ) {}

  ionViewWillEnter() {
    this.showForm = this.zmService.loginRequired;
    if (!this.showForm) {
      this.verifyConnection();
    }
  }

  async verifyConnection() {
    const isConnected = await this.zmService.isConnected();
    if (isConnected) {
      this.setMonitors();
    }
  }

  async setMonitors() {
    this.monitors = await this.zmService.getMonitors();
  }

  openMonitor(monitor: ZmMonitor) {
    this.navCtrl.navigateForward('/monitor/' + monitor.id + '/' + monitor.name);
  }

  submit(data) {
    this.loginForm = data.form.value;
    this.zmService
    .login(this.loginForm)
    .then(() => {
      this.showForm = false;
      this.setMonitors();
    })
    .catch(err => {
      this.showError(err);
    });
  }

  logout() {
    this.monitors = [];
    this.showForm = true;
    this.zmService.removeData();
  }

  async showError(msg: string) {
    const alert = await this.alertController.create({
      header: 'Connection error',
      message: msg,
      buttons: ['OK']
    });
    await alert.present();
  }
}
