import { Routes } from '@angular/router';
import { InventoryManagementComponent } from './ui/view/inventory-management/inventory-management.component';

export const routes: Routes = [
    {
        path: ':uuid',
        component: InventoryManagementComponent
    }
];
