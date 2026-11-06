import { Component, OnInit, Type } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HrNotificationsComponent } from '../../hr/hr-notifications/hr-notifications.component';

@Component({
  selector: 'app-commerce-settings',
  templateUrl: './commerce-settings.component.html',
  styleUrl: './commerce-settings.component.scss',
})
export class CommerceSettingsComponent implements OnInit {
  sidebar = false;
  selectedComp: Type<any> | null = null;
  selectedInputs: Record<string, unknown> = {};
  searchTerm = '';

  private readonly COMMERCE_MODULE_KEYS = [
    'INVENTORY', 'SALES', 'PROCUREMENT', 'VENDOR_MANAGEMENT', 'VENDOR_PORTAL', 'LOGISTICS',
  ];

  settings = [
    {
      name: 'Notification Subscriptions', key: 'notifications', icon: 'fas fa-bell',
      component: HrNotificationsComponent,
      inputs: { moduleKeys: this.COMMERCE_MODULE_KEYS },
      subSetting: ['Email · In-App · Push · SMS', 'Per-event toggles', 'Inventory, Sales, Procurement, Vendor, Logistics'],
    },
    {
      name: 'Sales Configuration', key: 'sales-config', icon: 'fas fa-receipt',
      component: null, inputs: {},
      subSetting: ['Quote settings', 'Invoice preferences', 'Payment terms'],
    },
    {
      name: 'Procurement Configuration', key: 'procurement-config', icon: 'fas fa-shopping-cart',
      component: null, inputs: {},
      subSetting: ['RFQ templates', 'Vendor defaults', 'Approval chains'],
    },
    {
      name: 'Inventory Configuration', key: 'inventory-config', icon: 'fas fa-boxes',
      component: null, inputs: {},
      subSetting: ['Reorder thresholds', 'Warehouse settings', 'Stock tracking'],
    },
    {
      name: 'Vendor Management', key: 'vendor-mgmt-config', icon: 'fas fa-handshake',
      component: null, inputs: {},
      subSetting: ['Onboarding rules', 'Compliance settings', 'Portal access'],
    },
    {
      name: 'Logistics Configuration', key: 'logistics-config', icon: 'fas fa-truck',
      component: null, inputs: {},
      subSetting: ['Routing rules', 'Delivery zones', 'Rider settings'],
    },
  ];

  filteredSettings = [...this.settings];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.filteredSettings = [...this.settings];
    this.route.queryParams.subscribe(params => {
      const panel = params['panel'];
      if (panel) {
        const match = this.settings.find(s => s.key === panel);
        if (match?.component) {
          this.sidebar = true;
          this.selectedComp = match.component as any;
          this.selectedInputs = match.inputs ?? {};
        }
      }
    });
  }

  filterSettings(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredSettings = this.settings.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.subSetting.some(sub => sub.toLowerCase().includes(term))
    );
  }

  openSideBar(setting: any): void {
    if (!setting.component) return;
    this.sidebar = true;
    this.selectedComp = setting.component;
    this.selectedInputs = setting.inputs ?? {};
  }
}
