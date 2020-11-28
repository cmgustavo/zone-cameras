import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { MonitorPage } from './monitor.page';

import { MonitorPageRoutingModule } from './monitor-routing.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, MonitorPageRoutingModule],
  declarations: [MonitorPage]
})
export class MonitorPageModule {}
