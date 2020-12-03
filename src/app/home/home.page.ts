import { Component } from '@angular/core';
import {
  AlertController,
  NavController,
  LoadingController
} from '@ionic/angular';

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
    private alertController: AlertController,
    private navCtrl: NavController,
    private loadingController: LoadingController
  ) {}

  ionViewWillEnter() {
    this.showForm = this.zmService.isLoggued() ? false : true;
    if (!this.showForm) {
      this.setMonitors();
    }
  }

  async setMonitors() {
    this.monitors = await this.zmService.getMonitors();
  }

  openMonitor(monitor: ZmMonitor) {
    this.navCtrl.navigateForward('/monitor/' + monitor.id + '/' + monitor.name);
  }

  async submit(data) {
    this.loginForm = data.form.value;
    const loading = await this.loadingController.create({
      message: 'Please wait...'
    });
    await loading.present();
    this.zmService
      .login(this.loginForm)
      .then(() => {
        loading.dismiss();
        this.showForm = false;
        this.setMonitors();
      })
      .catch(err => {
        loading.dismiss();
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
      header: 'Login Error',
      message: msg,
      buttons: ['OK']
    });
    await alert.present();
  }
}
