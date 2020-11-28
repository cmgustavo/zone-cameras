import { Component, OnInit } from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import { ZoneminderService } from '../services/zoneminder.service';

@Component({
  selector: 'app-monitor',
  templateUrl: './monitor.page.html',
  styleUrls: ['./monitor.page.scss']
})
export class MonitorPage implements OnInit {
  public streamUrl: string;
  constructor(
    private route: ActivatedRoute,
    private zmService: ZoneminderService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    console.log('[monitor.page.ts:15]', id); /* TODO */

    this.streamUrl = this.zmService.viewStream(id);
    console.log('[monitor.page.ts:20]', this.streamUrl); /* TODO */
  }
}
