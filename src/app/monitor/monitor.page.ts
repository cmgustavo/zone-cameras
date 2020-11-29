import { Component, OnInit } from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import { ZoneminderService } from '../services/zoneminder.service';

@Component({
  selector: 'app-monitor',
  templateUrl: './monitor.page.html',
  styleUrls: ['./monitor.page.scss']
})
export class MonitorPage {
  public name: string;
  public streamUrl: string;
  constructor(
    private route: ActivatedRoute,
    private zmService: ZoneminderService
  ) {}

  ionViewWillEnter() {
    const id = this.route.snapshot.paramMap.get('id');
    const name = this.route.snapshot.paramMap.get('name');
    this.name = name;
    this.streamUrl = this.zmService.viewStream(id);
  }
}
