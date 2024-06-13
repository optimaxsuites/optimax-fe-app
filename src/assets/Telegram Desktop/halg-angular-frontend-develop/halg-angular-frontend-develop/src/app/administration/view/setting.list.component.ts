import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import {MegaMenuItem, MenuItem} from 'primeng/api';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
@Component({
  selector: 'app-setting-list',
  templateUrl: './setting.list.component.html',
  encapsulation: ViewEncapsulation.None
})
export class SettingListComponent implements OnInit {

  breadcrumbItems: MenuItem[];



    usersManagement: MenuItem[];
    formsManagement: MenuItem[];
    reportsManagement: MenuItem[];


  constructor(private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Access Control Management', routerLink: ['/setting'] }
  ]);
  }

  ngOnInit() {
    this.usersManagement = [
      {
          label: 'Users and Groups',
          items: [
              {
                  label: 'Add/Manage Users',
                  icon: 'pi pi-fw pi-plus',
                  routerLink: '/userlist'
              },
              {
                  label: 'Add/Manage User Groups',
                  icon: 'pi pi-fw pi-user-edit'
              }
          ]
      },
      {
          label: 'Users and Roles',
          items: [
              {
                  label: 'Add/Manage Roles',
                  icon: 'pi pi-fw pi-list',
                  routerLink: '/userrolelist'
              },
              {
                  label: 'Add/Manage Permission Roles',
                  icon: 'pi pi-fw pi-search'
              }

          ]
      },

  ];
  this.formsManagement = [
    {
        label: 'Forms Modules',
        items: [
            {
                label: 'Add/Manage Form Modules',
                icon: 'pi pi-fw pi-plus',
                routerLink: '/afattr'
            },
            {
                label: 'Add/Manage Forms Roles and Permission',
                icon: 'pi pi-fw pi-user-edit'
            }
        ]
    },
    {
        label: 'Form Builder',
        items: [
            {
                label: 'Build KP Forms',
                icon: 'pi pi-fw pi-list',
                routerLink: '/fbuilder'
            },
            {
                label: 'Manage KP Forms',
                icon: 'pi pi-fw pi-search'
            }

        ]
    },

];
this.reportsManagement = [
  {
      label: 'Reports Modules',
      items: [
          {
              label: 'Add/Manage Reports',
              icon: 'pi pi-fw pi-plus',
              routerLink: '/dashboard'
          },
          {
              label: 'Add/Manage Report Groups',
              icon: 'pi pi-fw pi-user-edit'
          }
      ]
  },
  {
      label: 'Report Accessibility',
      items: [
          {
              label: 'Report Builder ',
              icon: 'pi pi-fw pi-list'
          },
          {
              label: 'Add/Manage Report Roles',
              icon: 'pi pi-fw pi-search'
          }

      ]
  },

];
  }

}
