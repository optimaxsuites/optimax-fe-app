import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { MasterComponent } from './layout/master/master.component';
import { DefaultComponent } from './layout/default/default.component';
import { LoginComponent } from './accounts/login/login.component';
import { RegisterComponent } from './accounts/register/register.component';
import { AccountingPageComponent } from './pages/accounting-page/accounting-page.component';
import { MembersPageComponent } from './pages/members-page/members-page.component';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';
import { InvoiceModalComponent } from './components/invoice-modal/invoice-modal.component';
import { SalesCardComponent } from './components/sales-card/sales-card.component';
import { SalesPageComponent } from './pages/sales-page/sales-page.component';
import { QuotationComponent } from './components/quotation/quotation.component';
import { ProformaInvoiceComponent } from './components/proforma-invoice/proforma-invoice.component';
import { ReceiptComponent } from './components/receipt/receipt.component';

const routes: Routes = [
  {
    path: '',
    component: DefaultComponent,
    children: [
        {
            path: '', 
            component: LoginComponent, 
        },
        {
            path: 'register',
            component: RegisterComponent
        }
    ]
  },


{
    path: '',
    component: MasterComponent,
    children: [
        {
          path: 'dashboard', 
          component: DashboardPageComponent
        },
        {
          path: 'sales', 
          component: SalesPageComponent,
        },
        {
          path: 'accounting', 
          component: AccountingPageComponent,
        },

        {
          path: 'invoice', 
          component: AccountingPageComponent,
          children: [
            // {
            //   path: 'create-new-invoice',
            //   component: InvoiceModalComponent
            // }
          ]
        },

        {
          path: 'members', 
          component: MembersPageComponent,
        },

        {
          path: 'settings', 
          component: SettingsPageComponent
        },
        {
          path: 'invoice-modal',
          component: InvoiceModalComponent
        }
        

    ]
}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
