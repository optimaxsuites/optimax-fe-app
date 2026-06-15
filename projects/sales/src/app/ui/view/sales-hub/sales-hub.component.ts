import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { SalesDashboardComponent } from './sales-dashboard/sales-dashboard.component';
import { ProductServiceCatalogComponent } from './product-service-catalog/product-service-catalog.component';
import { SalesOrdersComponent } from './sales-orders/sales-orders.component';
import { PaymentProcessingComponent } from './payment-processing/payment-processing.component';
import { CustomerManagementComponent } from './customer-management/customer-management.component';
import { DeliveryManagementComponent } from './delivery-management/delivery-management.component';
import { QuoteListComponent } from './quotations/quote-list/quote-list.component';
import { InvoiceListComponent } from './invoices/invoice-list/invoice-list.component';


@Component({
  selector: 'app-sales-hub',
  templateUrl: './sales-hub.component.html',
  styleUrl: './sales-hub.component.scss'
})
export class SalesHubComponent {

  tabsConfig: TabConfig[] = [
    {
      name: 'Dashboard',
      component: SalesDashboardComponent,
      icon: 'fa-sharp fa-solid fa-chart-line',
    },
    {
      name: 'Manage Catalog',
      component: ProductServiceCatalogComponent,
      icon: 'fa-sharp fa-solid fa-layer-group',
    },
    {
      name: 'See Quotes',
      component: QuoteListComponent,
      icon: 'fa-solid fa-file',
    },
    {
      name: 'Invoices',
      component: InvoiceListComponent,
      icon: 'fa-solid fa-file-invoice-dollar',
    },
    {
      name: 'Order History',
      component: SalesOrdersComponent,
      icon: 'fa-solid fa-clock-rotate-left',
    },
    {
      name: 'Customer List',
      component: CustomerManagementComponent,
      icon: 'fa-solid fa-list',
    }
  ];

}


