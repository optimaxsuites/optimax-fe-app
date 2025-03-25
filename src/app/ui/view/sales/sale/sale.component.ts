import { Component } from '@angular/core';
import { TabConfig } from '../../../sharedComponent/service/interface/data';
import { SalesComponent } from '../sales.component';
import { SaleSummariesComponent } from '../sale-summaries/sale-summaries.component';

@Component({
  selector: 'app-sale',
  templateUrl: './sale.component.html',
  styleUrl: './sale.component.scss',
})
export class SaleComponent {
  tabsConfig: TabConfig[] = [
    { name: ' Sale Summary', component: SaleSummariesComponent },
    { name: ' Sales', component: SalesComponent },
  ];
}
