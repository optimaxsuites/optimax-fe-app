import { Component } from '@angular/core';
import { TabConfig } from '../../sharedComponent/service/interface/data';
import { HousekeepingRecordsComponent } from '../housekeeping-records/housekeeping-records.component';
import { HousekeepingFoundComponent } from '../housekeeping-found/housekeeping-found.component';
import { HousekeepingLostitemComponent } from '../housekeeping-lostitem/housekeeping-lostitem.component';

@Component({
  selector: 'app-house-keeping',
  templateUrl: './house-keeping.component.html',
  styleUrl: './house-keeping.component.scss',
})
export class HouseKeepingComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Housekeeping Record', component: HousekeepingRecordsComponent },
    { name: 'Found Items', component: HousekeepingFoundComponent },
    { name: 'Lost Items', component: HousekeepingLostitemComponent },
  ];
}
