import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VendorCategoryComponent } from './ui/view/vendor-category/vendor-category.component';
import { VendorIndividualComponent } from './ui/view/vendor-individual/vendor-individual.component';
import { VendorListComponent } from './ui/view/vendor-list/vendor-list.component';
import { VendorManagementComponent } from './ui/view/vendorMangement/vendorManagement';
import { CrmPageComponent } from './ui/view/crm-page.component';

const routes: Routes = [
      {
        path: '',
        component: CrmPageComponent,
      },
     {
        path: 'crm/vendorCategory',
        component: VendorCategoryComponent,
      },
      {
        path: 'crm/individualVendor',
        component: VendorIndividualComponent,
      },

      {
        path: 'crm/vendorList',
        component: VendorListComponent,
      },
      {
        path: 'crm/vendorManagement',
        component: VendorManagementComponent,
      },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
