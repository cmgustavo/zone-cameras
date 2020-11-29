import { Component } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';

import { ZoneminderService } from '../services/zoneminder.service';

import { LoginForm } from '../services/services.types';

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
    this.zmService.isConnected().then(connected => {
      if (!connected) {
        this.showForm = true;
        return;
      }
      this.zmService.getMonitors().then(monitors => {
        this.monitors = monitors;
      });
    });
  }

  openMonitor(monitor) {
    this.navCtrl.navigateForward('/monitor/' + monitor.id);
  }

  submit() {
    this.zmService
      .login(this.loginForm)
      .then(isConnected => {
        this.showForm = false;
        this.zmService.getMonitors().then(monitors => {
          this.monitors = monitors;
        });
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
