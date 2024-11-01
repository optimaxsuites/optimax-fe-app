import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InventoryPageComponent } from './ui/view/inventory-page.component';
import { InventoryFormComponent } from './ui/view/inventory-form/inventory-form.component';
import { ViewProductAsideComponent } from './ui/sharedComponent/view/view-product-aside/view-product-aside.component';

const routes: Routes = [
   {
        path: '',
        component: InventoryPageComponent,
      },
      {
        path: 'inventory/inventory-form',
        component: InventoryFormComponent
      },
      {
        path: 'inventory/inventory-form/:id',
        component: InventoryFormComponent,
      },
      {
        path: 'inventory/view-product',
        component: ViewProductAsideComponent,}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
