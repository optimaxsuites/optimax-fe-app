import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DefaultComponent } from './default.component';
import { LoginComponent } from './ui/auth/view/login/login.component';
import { RegisterComponent } from './ui/auth/view/register/register.component';
import { MailVerificationComponent } from './ui/auth/view/mail-verification/mail-verification.component';
import { VerificationSuccessfullComponent } from './ui/auth/view/mail-verification/verification-successfull.component';
import { VerificationFailedComponent } from './ui/auth/view/mail-verification/verification-failed.component';
import { UserRegLayoutComponent } from './ui/auth/view/user-reg-layout.component';
import { BusinessRegComponent } from './ui/auth/view/business-reg/business-reg.component';
import { UserComponent } from './user.component';
// import { PosCheckoutPageComponent } from './ui/pos/view/pos-checkout-page/pos-checkout-page.component';
// import { CheckoutOrdersComponent } from './ui/pos/view/checkout-orders.component';

import { MasterComponent } from './master.component';
import { SalesPageComponent } from './ui/sales/view/sales-page.component';
import { QuotationModalComponent } from './ui/sales/view/quotation-modal/quotation-modal.component';
// import { CheckoutOrdersComponent } from './ui/pos/view/checkout-orders/checkout-orders.component';
// import { CashPaymentComponent } from './ui/pos/view/cash-payment/cash-payment.component';
// import { OrderDetailComponent } from './ui/pos/view/order-detail/order-detail.component';
import { VerifyTokenComponent } from './ui/auth/view/verify-token/verify-token.component';

// import { OrderRefundComponent } from './ui/pos/view/order-refund/order-refund.component';
// import { RequestDetailsComponent } from './ui/pos/view/request-details/request-details.component';
// import { OpenRegisterComponent } from './ui/pos/view/open-register/open-register.component';
// import { CloseRegisterComponent } from './ui/pos/view/close-register/close-register.component';
import { AuthGuard } from './ui/auth/service/auth.guard';
import { JopOpeningsComponent } from './jop.openings.component';
import { CareerJobPostingComponent } from './ui/shared/view/career-job-posting/career-job-posting.component';
import { JobApplicationFormComponent } from './ui/shared/view/job-application-form/job-application-form.component';
import { EmployeeOnboardingFormComponent } from 'projects/hr/src/app/ui/view/employee-management/employee-onboarding-form/employee-onboarding-form.component';
import { MarketplaceComponent } from './ui/marketplace/view/marketplace/marketplace.component';
import { NotFoundComponent } from './ui/not-found.component';
import { UnauthourizedComponent } from './ui/unauthourized.component';
import { PaymentComponent } from './ui/marketplace/view/payment/payment.component';
import { TenantsComponent } from './ui/tenants/tenants.component';
import { ChildUuidGuard, UuidGuard } from './ui/auth/domain/uuid-route.guard';

const routes: Routes = [
  {
    path: 'users/auth/verify',
    component: VerifyTokenComponent,
  },

  {
    path: 'user/auth',
    canActivate: [UuidGuard],
    component: DefaultComponent,
    children: [
      {
        path: ':uuid',
        component: LoginComponent,
      },
      {
        path: 'sign-up/:uuid',
        component: RegisterComponent,
      },
      {
        path: 'emv/:uuid',
        component: MailVerificationComponent,
      },
      {
        path: 'vrs/:uuid',
        component: VerificationSuccessfullComponent,
      },
      {
        path: 'vrf/:uuid',
        component: VerificationFailedComponent,
      },
  
    
    ],
  },
    {
    path: '',
    redirectTo: 'user/auth/4a48c75c-dc92-43cd-a2bb-943eb1fef8f8',
    pathMatch: 'full',
  },
  
  {
    path: 'admin/settings/user-reg/:uuid',
    component: UserRegLayoutComponent,
    canActivate: [AuthGuard, UuidGuard],
  },
  {
    path: 'business-registration',
    component: BusinessRegComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'user/onboarding/:id/:uuid',
    component: EmployeeOnboardingFormComponent,
  },
  {
    path: 'user',
    component: UserComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'checkout',
        loadChildren: () => import('../../projects/POS/src/app/user/user.module').then(m => m.UserModule),
        canActivate: [UuidGuard]

      },
      {
        path: 'hospitality',
        loadChildren: () => import('../../projects/hospitality/src/app/user/user.module').then(m => m.UserModule),
        canActivate: [UuidGuard]

      },
    ],
  },
    {
    path: 'optimerce',
    component: UserComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('../../projects/POS/src/app/optimerce/optimerce.module').then(m => m.OptimerceModule),
        canActivate: [UuidGuard]

      }
    ],
  },

  {
    path: 'admin',
    component: MasterComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('../../projects/dashboard/src/app/app.module').then(m => m.AppDashboardModule),
        canActivate: [UuidGuard]
      },
      {
        path: 'hr',
        loadChildren: () => import('../../projects/hr/src/app/app.module').then(m => m.AppHrModule),
        canActivate: [UuidGuard]

      },
      {
        path: 'settings',
        loadChildren: () => import('../../projects/settings/src/app/app.module').then(m => m.AppSettingsModule),
        canActivateChild: [ChildUuidGuard]

      },
      {
        path: 'pos',
        loadChildren: () => import('../../projects/POS/src/app/app.module').then(m => m.AppPOSModule),
        canActivate: [UuidGuard]

      },
      {
        path: 'expenses',
        loadChildren: () => import('../../projects/expense/src/app/app.module').then(m => m.AppExpensesModule),
        canActivate: [UuidGuard]

      },
      {
        path: 'accounting',
        loadChildren: () => import('../../projects/accounting/src/app/app.module').then(m => m.AppAccountingModule),
        canActivate: [UuidGuard]

      },
      {
        path: 'procurement',
        loadChildren: () => import('../../projects/procurement/src/app/app.module').then(m => m.AppModule),
        canActivate: [UuidGuard]

      },
      {
        path: 'crm',
        loadChildren: () => import('../../projects/CRM/src/app/app.module').then(m => m.AppModule),
        canActivate: [UuidGuard]

      },
      {
        path: 'vendor',
        loadChildren: () => import('../../projects/vendor/src/app/app.module').then(m => m.AppModule),
        canActivate: [UuidGuard]

      },
      {
        path: 'tender',
        loadChildren: () => import('../../projects/tender/src/app/app.module').then(m => m.AppModule),
        canActivate: [UuidGuard]

      },
      {
        path: 'productivity',
        loadChildren: () => import('../../projects/productivity/src/app/app.module').then(m => m.AppModule),
        canActivate: [UuidGuard]

      },
      {
        path: 'hospitality',
        loadChildren: () => import('../../projects/hospitality/src/app/app.module').then(m => m.AppModule),
        canActivate: [UuidGuard]

      },
      {
        path: 'admin/sales/:uuid',
        component: SalesPageComponent,
      },
      {
        path: 'sales/quotation/quotation-form',
        component: QuotationModalComponent,
      },
      {
        path: 'sales/quotation/quotation-form/:id',
        component: QuotationModalComponent,
      },
      {
        path: 'marketplace/:uuid',
        component: MarketplaceComponent,
      },
      {
        path: 'tenant/:uuid',
        component: TenantsComponent,
      },
     
    ],
  },

  {
    path: 'subscription/:id',
    component: PaymentComponent
  },

  {
    path: 'career',
    component: JopOpeningsComponent, 
    children:[
      {
        path:'job-posting',
        component: CareerJobPostingComponent,
      },
      {
        path: 'job-posting/:id',
        component: JobApplicationFormComponent,
      }   
    ]
  },
  {
    path: 'job-application',
    component: JopOpeningsComponent, 
  },
  {
    path:'unauthorized',
    component: UnauthourizedComponent
  },

  { path: '**', component: NotFoundComponent }

  
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
