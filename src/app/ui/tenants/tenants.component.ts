import { Component } from '@angular/core';

@Component({
  selector: 'app-tenants',
  templateUrl: './tenants.component.html',
  styleUrl: './tenants.component.scss'
})
export class TenantsComponent {
tenants: any = [
  {
    id: 'tenant_001',
    name: 'Optimax Internal',
    domain: 'optimax.centrifugegroup.com',
    subscriptions: [
      { plan: 'Pro', modules: ['Inventory', 'Sales', 'Reports'], limits: { users: 50, projects: 20 } }
    ],
    contactPerson: 'oluwadarequeensheba@gmail.com',
    status: 'Active',
    dateCreated: '2024-01-15T10:24:00Z'
  },
  {
    id: 'tenant_002',
    name: 'Mod Solutions',
    domain: 'mod.centrifugegroup.com',
    subscriptions: [
      { plan: 'Basic', modules: ['Sales'], limits: { users: 5, projects: 2 } }
    ],
    status: 'Active',
    contactPerson: 'centrifugegroup@gmail.com',
    dateCreated: '2024-03-02T08:12:00Z'
  },
  {
    id: 'tenant_003',
    name: 'Alpha Retail',
    domain: 'alpha.centrifugegroup.com',
    subscriptions: [
      { plan: 'Enterprise', modules: ['Inventory', 'Sales', 'Reports', 'Analytics'], limits: { users: 200, projects: 100 } }
    ],
    status: 'Suspended',
    contactPerson: 'davidcrane@gmail.com',

    dateCreated: '2023-11-20T14:45:00Z'
  },
  {
    id: 'tenant_004',
    name: 'Beta Traders',
    domain: 'beta.centrifugegroup.com',
    subscriptions: [
      { plan: 'Pro', modules: ['Inventory', 'Sales'], limits: { users: 20, projects: 10 } }
    ],
    status: 'Active',
    contactPerson: 'ngozionkojo@gmail.com',

    dateCreated: '2024-02-18T12:30:00Z'
  },
  {
    id: 'tenant_005',
    name: 'Gamma Corp',
    domain: 'gamma.centrifugegroup.com',
    subscriptions: [
      { plan: 'Basic', modules: ['Sales'], limits: { users: 3, projects: 1 } }
    ],
    status: 'Inactive',
    contactPerson: 'adenijijones@gmail.com',

    dateCreated: '2023-12-05T09:00:00Z'
  }
];
selectedTenant: any = null
openDetailsModal: boolean = false

formatDate(parts: any): Date | null {
  if (!parts) return null;
  if (Array.isArray(parts)) return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  if (typeof parts === 'string' || parts instanceof Date) {
    const d = new Date(parts);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

openDetails(order: any){
  this.selectedTenant = order;
  this.openDetailsModal = true
}

}
