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
  {
    path: 'admin/expenses',
    component: ExpensesComponent,
  },
   { path: 'admin/expenses/:uuid',
        component: ExpensesComponent,
      },
      {
        path: 'admin/expensesForm',
        component: ExpenseFormsModalComponent,
      },
      {
       path: 'admin/expenses/reimbursement/:uuid',
       component: ReimbursementComponent,
      },
       {
        path: 'admin/expenses/advance/:uuid',
        component: DisbursementComponent,
      },
      {
        path: 'admin/expenses/report/:uuid',
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
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
