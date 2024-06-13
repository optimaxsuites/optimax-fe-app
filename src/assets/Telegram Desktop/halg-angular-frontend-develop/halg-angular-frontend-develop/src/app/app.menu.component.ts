import { Component, OnInit } from '@angular/core';
import {AppComponent} from './app.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-menu',
  template: `
        <ul class="layout-menu">
            <li app-menuitem *ngFor="let item of model; let i = index;" [item]="item" [index]="i" [root]="true"></li>
        </ul>
    `
})
export class AppMenuComponent implements OnInit {
  model: any[];
  FontAwesomeModule: any[];

  constructor(public app: AppComponent) {

   }

  ngOnInit() {
    this.model = [

      {
          label: 'Main Navigation', icon: 'pi pi-fw pi-home',
          items: [
              {label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/dashboard']}
          ]
      },
      {
          label: 'KP Client', icon: 'fa fa-user-md fa-5x', routerLink: [''],
          items: [
              {label: 'Register KP', icon: 'pi pi-fw pi-user-plus', routerLink: ['/sReg/basic']},
            //   {label: 'Initiate Appointment', icon: 'fa fa-medkit fa-5x', routerLink: ['cAppointment']},
              {label: 'Clinics', icon: 'fa fa-user-md fa-5x', routerLink: ['/cclinics']},
              {label: 'KP Portal', icon: 'fa fa-heartbeat fa-5x', routerLink: ['/cportal']}
          ]
      },

      {
          label: 'Laboratory', icon: 'fa fa-stethoscope fa-5x', routerLink: ['utilities'],
          items: [
              {label: 'Laboratory Tests', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/cLabtest']},
            //   {label: 'Laboratory Order Form', icon: 'fa fa-thermometer fa-5x', routerLink: ['']},
            //  {label: 'Report', icon: 'pi pi-fw pi-briefcase', routerLink: ['']}
          ]
      },
      {
          label: 'Pharmacy', icon: 'fa fa-plus fa-5x', routerLink: ['/pages'],

          items: [
            //   {label: 'Prescription', icon: 'fa fa-stethoscope fa-5x', routerLink: ['/prescription'] },
              {label: 'Phamarcy Order Form', icon: 'pi pi-fw pi-calendar-plus', routerLink: ['/prescription ']},
              {label: 'Phamarcy Refill', icon: 'pi pi-fw pi-calendar-plus', routerLink: ['pportal']},

             // {label: 'Report', icon: 'pi pi-fw pi-book', url: '', target: '_blank'}
          ]
      },
      {
        label: 'Report', icon: 'pi pi-fw pi-folder-open', routerLink: ['/pages'],
        items: [
            {label: 'KP Data Visualization', icon: 'pi pi-fw pi-user-edit', routerLink: ['/kpdvt']},
          //  {label: 'Clinical Report', icon: 'pi pi-fw pi-calendar-plus', routerLink: ['']},
           // {label: 'Pharmacy Report', icon: 'pi pi-fw pi-briefcase', url: '', target: ''},
           // {label: 'Laboratory Report', icon: 'fa fa-stethoscope fa-5x', routerLink: ['']}
        ]
    },
    {
      label: 'Administration', icon: 'pi pi-fw pi-users', routerLink: [''],
      items: [

          {label: 'Metadata', icon: 'pi pi-fw pi-calendar-plus', routerLink: ['/metadatalist']},


          {label: 'Settings', icon: 'pi pi-fw pi-cog', routerLink: ['/setting']},
          {label: 'Data Migration', icon: 'pi pi-cloud-download', routerLink: ['/datamigration']},

          {label: 'Interoperability', icon: 'pi pi-fw pi-share-alt', routerLink:['/interperability'], url: '', target: '_blank'},
          {label: 'Support', icon: 'pi pi-fw pi-thumbs-up', routerLink: ['/login']}
      ]
  }


  ];
}


}
