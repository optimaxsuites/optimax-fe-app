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


const routes: Routes = [
   { path: ':uuid'},
  {
    path: 'expenses',
    component: ExpensesComponent,
  },
   { path: 'expenses/:uuid',
        component: ExpensesComponent,
      },
      {
        path: 'expensesForm',
        component: ExpenseFormsModalComponent,
      },
      {
       path: 'reimbursement/:uuid',
       component: ReimbursementComponent,
      },
       {
        path: 'advance/:uuid',
        component: DisbursementComponent,
      },
      {
        path: 'report/:uuid',
        component: ApprovalReportsComponent,
      },
      {
        path: 'expensesApproval/:id',
        component: ExpenseApprovalComponent,
      },
      {
        path: 'uploadReciept',
        component: UploadRecieptComponent,
      },
      {
        path: 'Addperdiem',
        component: AddPerDiemComponent,
      },
      {
        path:'expense-summary',
        component:ExpenseSummaryComponent
      }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
