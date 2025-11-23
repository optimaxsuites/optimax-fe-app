import { Component } from '@angular/core';
import { CheckoutComponent } from '../checkout/checkout.component';
import { UserSettingComponent } from '../../user-setting/user-setting.component';
import { PAndISettingComponent } from '../p-and-isetting/p-and-isetting.component';
import { BusInfoSettingComponent } from '../bus-info-setting/bus-info-setting.component';
import { BranchesComponent } from '../branches/branches.component';

@Component({
  selector: 'app-pos-setting',
  templateUrl: './pos-setting.component.html',
  styleUrl: './pos-setting.component.scss',
})
export class PosSettingComponent {
  sidebar: boolean = false;
  hoveredIndex: number = -1;

  settings = [
    // {
    //   name: 'Business Information',
    //   subSetting: [
    //     ' Custom business info',
    //     'tax settings',
    //     'language',
    //     'currency preferences',
    //   ],
    //   icon: 'pi pi-receipt',
    //   component: BusInfoSettingComponent,
    // },
    {
      name: 'E-store Settings',
      subSetting: ['Payment information', 'stock alerts'],
      icon: 'pi pi-receipt',
      component: PAndISettingComponent,
    },
    // {
    //   name: 'Payment Settings',
    //   subSetting: [
    //     'Salary Structure',
    //     'Deductions and Overtime',
    //     'Bonuses and Benefits',
    //     'Payslip',
    //   ],
    //   icon: 'pi pi-receipt',
    //   component: null,
    // },
    // {
    //   name: 'Report Settings',
    //   subSetting: ['Customize', 'export sales', 'stock reports'],
    //   icon: 'pi pi-receipt',
    //   component: null,
    // },
    {
      name: 'Branches & Location',
      subSetting: [
        'Salary Structure',
        'Deductions and Overtime',
        'Bonuses and Benefits',
        'Payslip',
      ],
      icon: 'pi pi-receipt',
      component: BranchesComponent,
    },
    // {
    //   name: 'Customization Settings',
    //   subSetting: [
    //     'Salary Structure',
    //     'Deductions and Overtime',
    //     'Bonuses and Benefits',
    //     'Payslip',
    //   ],
    //   icon: 'pi pi-receipt',
    //   component: null,
    // },
  ];

  selectedComp = null;
  openSideBar = (setting: any) => {
    this.sidebar = true;
    this.selectedComp = setting.component;
  };
  searchTerm: string = '';

  filteredSettings = [...this.settings];

  ngOnInit(): void {
    this.filteredSettings = [...this.settings];
  }

  filterSettings(): void {
    const term = this.searchTerm.toLowerCase();

    this.filteredSettings = this.settings.filter((setting) => {
      const nameMatch = setting.name.toLowerCase().includes(term);
      const subSettingMatch = setting.subSetting.some((sub) =>
        sub.toLowerCase().includes(term)
      );
      return nameMatch || subSettingMatch;
    });

    console.log(this.filteredSettings);
  }
}
