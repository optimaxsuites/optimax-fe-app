import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExpensesComponent } from './ui/view/expenses.component';
import { ExpenseFormsModalComponent } from './ui/view/expense-forms-modal/expense-forms-modal.component';
import { ExpenseApprovalComponent } from './ui/view/expense-approval/expense-approval.component';
import { UploadRecieptComponent } from './ui/view/upload-reciept/upload-reciept.component';
import { AddPerDiemComponent } from './ui/view/add-per-diem/add-per-diem.component';
import { ExpenseSummaryComponent } from './ui/view/expense-summary/expense-summary.component';
import { ReimbursementComponent } from './ui/view/reimbursement/reimbursement.component';
import { DisbursementComponent } from './ui/view/disbursement/disbursement.component';
import { ApprovalReportsComponent } from './ui/view/approval-reports/approval-reports.component';
import { TaxReportComponent } from './ui/view/tax-report/tax-report.component';
import { MobileCheckoutComponent } from './ui/view/mobile-checkout/mobile-checkout.component';


const routes: Routes = [

  // { path: '', redirectTo: '', pathMatch: 'full' },

  // {
  //   path: '',
  //   children: [
      // default child when someone lands on /admin/expenses
      { path: '', redirectTo: 'expense/34567whr4567yhsdzr56', pathMatch: 'full' },

      { path: 'expense/:uuid', component: ExpensesComponent },
      { path: 'expensesForm', component: ExpenseFormsModalComponent },
      { path: 'reimbursement/:uuid', component: ReimbursementComponent },
      { path: 'advance/:uuid', component: DisbursementComponent },
      { path: 'report/:uuid', component: ApprovalReportsComponent },
      { path: 'tax-report/:uuid', component: TaxReportComponent },
      { path: 'mobile/checkout/:uuid', component: MobileCheckoutComponent },
      { path: 'expensesApproval/:id', component: ExpenseApprovalComponent },
      { path: 'uploadReciept', component: UploadRecieptComponent },
      { path: 'Addperdiem', component: AddPerDiemComponent },
      { path: 'expense-summary', component: ExpenseSummaryComponent },
    // ],
  // },

  // catch-all goes back to the expense base
  // { path: '**', redirectTo: 'admin/expenses' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
