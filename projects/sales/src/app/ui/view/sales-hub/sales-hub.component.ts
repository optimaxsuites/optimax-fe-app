import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { SalesDashboardComponent } from './sales-dashboard/sales-dashboard.component';
import { ProductServiceCatalogListComponent } from './product-service-catalog/product-service-catalog-list/product-service-catalog-list.component';
import { SalesOrdersListComponent } from './sales-order/sales-orders-list/sales-orders-list.component';
import { PaymentProcessingComponent } from './payment-processing/payment-processing.component';
import { CustomerListComponent } from './customer-management/customer-list/customer-list.component';
import { DeliveryManagementComponent } from './delivery-management/delivery-management.component';
import { QuoteListComponent } from './quotations/quote-list/quote-list.component';
import { InvoiceListComponent } from './invoices/invoice-list/invoice-list.component';
import { TransactionsHistoryComponent } from './transactions-history/transactions-history.component';

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
      name: 'Catalog',
      component: ProductServiceCatalogListComponent,
      icon: 'fa-sharp fa-solid fa-layer-group',
    },
    {
      name: 'Quotes',
      component: QuoteListComponent,
      icon: 'fa-solid fa-file',
    },
    {
      name: 'Invoices',
      component: InvoiceListComponent,
      icon: 'fa-solid fa-file-invoice-dollar',
    },
    {
      name: 'Orders',
      component: SalesOrdersListComponent,
      icon: 'fa-solid fa-clock-rotate-left',
    },
    {
      name: 'Customers',
      component: CustomerListComponent,
      icon: 'fa-solid fa-users',
      // icon: 'fa-solid fa-list',
    },
    {
      name: 'Transactions',
      component: TransactionsHistoryComponent,
      icon: 'fa-solid fa-money-bill',
    },
  ];

}


