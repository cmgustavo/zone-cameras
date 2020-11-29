import { Component, OnInit } from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import { ZoneminderService } from '../services/zoneminder.service';

@Component({
  selector: 'app-monitor',
  templateUrl: './monitor.page.html',
  styleUrls: ['./monitor.page.scss']
})
export class MonitorPage {
  public streamUrl: string;
  constructor(
    private route: ActivatedRoute,
    private zmService: ZoneminderService
  ) {}

  ionViewWillEnter() {
    const id = this.route.snapshot.paramMap.get('id');
    this.streamUrl = this.zmService.viewStream(id);
  }
}
