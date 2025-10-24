import { Component } from '@angular/core';
import { TabConfig } from '../../../sharedComponent/service/interface/data';
import { SaleSummariesComponent } from '../sale-summaries/sale-summaries.component';
import { EStoreOrdersListComponent } from './estore-orders-list/estore-orders-list.component';
@Component({
  selector: 'app-e-store-sales',
  templateUrl: './e-store-sales.component.html',
  styleUrl: './e-store-sales.component.scss'
})
export class EStoreSalesComponent {
    // 1. Define the Tab Structure
    tabsConfig: TabConfig[] = [
        // { 
        //     name: 'E-Store Summary', 
        //     component: SaleSummariesComponent,
        //     // Pass a data object to tell SaleSummariesComponent to filter for E-Store data
        //     data: { source: 'e-store' } 
        // },
        { 
            name: 'E-Store Orders', 
            component: EStoreOrdersListComponent, 
            data: { source: 'e-store' } 
        },
    ];
}
