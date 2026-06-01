import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountingPageComponent } from './ui/view/accounting-page.component';
import { QuotationModalComponent } from './ui/view/quotation-modal/quotation-modal.component';
import { AccountingReportsComponent } from './ui/view/accounting-reports/accounting-reports.component';
import { BalanceSheetComponent } from './ui/view/reports/balance-sheet/balance-sheet.component';
import { IncomeStatementComponent } from './ui/view/reports/income-statement/income-statement.component';
import { CashFlowComponent } from './ui/view/reports/cash-flow/cash-flow.component';
import { TaxSummaryComponent } from './ui/view/reports/tax-summary/tax-summary.component';
import { ReportTabsComponent } from './ui/view/reports/report-tabs/report-tabs.component';
import { BankAccountOverviewComponent } from './ui/view/bank-account-overview/bank-account-overview.component';
import { PaystackTransferDetailComponent } from './ui/view/bank-account-overview/paystack-transfer-detail/paystack-transfer-detail.component';
import { BankReconciliationComponent } from './ui/view/bank-reconciliation/bank-reconciliation.component';
import { GeneralReconciliationComponent } from './ui/view/general-reconciliation/general-reconciliation.component';
import { ReconciliationTabComponent } from './ui/view/reconciliation-tab/reconciliation-tab.component';
import { ReconciliationKanbanComponent } from './ui/view/reconciliation-kanban/reconciliation-kanban.component';
import { DeletedRecordsComponent } from './ui/view/deleted-records/deleted-records.component';
import { GeneralTransactionsComponent } from './ui/view/general-transactions/general-transactions.component';
import { AccountingQueueComponent } from './ui/view/accounting-queue/accounting-queue.component';
import { PayoutComponent } from './ui/view/disbursement/payout-wizard/payout-wizard.component';
import { PaystackComponent } from './ui/view/paystack/paystack.component';
import { PaystackInitiateTransferComponent } from './ui/view/paystack-initiate-transfer/paystack-initiate-transfer.component';

const routes: Routes = [
  {
    path: 'payout',
    component: PayoutComponent
  },
  {
    path: 'paystack',
    component: PaystackComponent
  },
  {
    path: 'paystack/initiate-transfer/:uuid',
    component: PaystackInitiateTransferComponent
  },
  {
    path: 'paystack/initiate-transfer',
    redirectTo: 'paystack/initiate-transfer/default',
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: 'transaction/dhwy7829iokdw',
    pathMatch: 'full',
  },
  {
    path: 'transaction/:uuid',
    component: AccountingPageComponent,
  },
  {
    path: 'reconciliation/:uuid',
    component: GeneralReconciliationComponent,
  },
  {
    path: 'admin/quotation-form/:id',
    component: QuotationModalComponent,
  },
  {
    path: 'admin/bankreconciliation/:id',
    component: BankReconciliationComponent,
  },
  {
    path:'admin/reconciliation-tab',
    component: ReconciliationTabComponent
  },
  {
    path: 'deleted-records',
    component: DeletedRecordsComponent
  },
  {
    path: 'reconciliation-kanban',
    component: ReconciliationKanbanComponent
  },
  {
    path: 'general-transactions',
    component: GeneralTransactionsComponent
  },
  {
    path: 'accounting-queue',
    component: AccountingQueueComponent
  },

  { path: 'reports', component: AccountingReportsComponent },
  { path: 'reports/balance-sheet', component: BalanceSheetComponent },
  { path: 'reports/income-statement', component: IncomeStatementComponent },
  { path: 'reports/cash-flow', component: CashFlowComponent },
  { path: 'reports/tax-summary', component: TaxSummaryComponent },
  { path: 'bankaccountoverview/:uuid', component: BankAccountOverviewComponent },
  {
    path: 'bankaccountoverview',
    redirectTo: 'bankaccountoverview/default',
    pathMatch: 'full'
  },
  { path: 'bankaccountoverview/paystack/transfer/:id/:uuid', component: PaystackTransferDetailComponent },
  { path: 'bankaccountoverview/paystack/transfer/:id', component: PaystackTransferDetailComponent },
  // ...other routes
  {
    path: 'reports/:uuid',
    component: ReportTabsComponent,
  },
  // {
  //   path: 'reports/balance-sheet',
  //    component: BalanceSheetComponent
  //   },
  // {
  //    path: 'reports/income-statement',
  //    component: IncomeStatementComponent
  //    },
  // {
  //    path: 'reports/cash-flow',
  //     component: CashFlowComponent
  //   },
  // {
  //   path: 'reports/tax-summary',
  //   component: TaxSummaryComponent
  //  },
  // { path: '', redirectTo: '/reports', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
