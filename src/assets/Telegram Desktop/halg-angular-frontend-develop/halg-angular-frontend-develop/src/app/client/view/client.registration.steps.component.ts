import { Component, OnInit,ViewEncapsulation } from '@angular/core';
import {MenuItem, MessageService} from 'primeng/api';
import { AppBreadcrumbService } from '../../app.breadcrumb.service';
import { Router } from '@angular/router';
import {ConfirmationService} from 'primeng/api';

@Component({
  selector: 'app-client-registration-steps-component',
  template:
  `<p-scrollTop
  icon="pi pi-arrow-up"
  styleClass="custom-scrolltop">
  </p-scrollTop>
      <p-card>
      <p-toast></p-toast>
      <p-steps [model]="stepsDOM" [readonly]="true" ></p-steps>
  </p-card>
  <br/>
  <router-outlet></router-outlet>`,
  styleUrls: ['./client.registration.steps.component.scss'],

  encapsulation: ViewEncapsulation.None,
  providers: [MessageService]
})
export class ClientRegistrationStepsComponent implements OnInit {

  stepsDOM: any[];

  constructor() {

     }

  ngOnInit(): void {
    this.stepsDOM = [{
      label: 'Basic Data',
      routerLink: '/sReg/basic'
  },
  {
      label: 'Next of Kin',
      routerLink: '/sReg/nextofkin'
  },
  {
      label: 'Biometrics',
      routerLink: '/sReg/biometric'
  },
  {
      label: 'Summary',
      routerLink: '/sReg/summary'
  }
];
  }

}
