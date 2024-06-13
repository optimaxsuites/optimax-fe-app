import { Component, OnInit } from '@angular/core';
import {MessageService,LazyLoadEvent, ConfirmationService} from 'primeng/api';
import { PharmacyDataExt } from '../domain/pharmacy.data';
declare var require: any;

@Component({
  selector: 'app-pharmacy-orders',
  template: `<p-toast position="top-center"></p-toast>
  <p-card>
    <ng-template pTemplate="title">
    <div class="p-grid p-justify-between">
     <b>Client Pharmacy Order Form</b>
     <div class="p-col-8">
     </div>
     <p-button icon="pi pi-print" iconPos="left"></p-button>
     </div>
     </ng-template>
     <ng-template pTemplate="content">
   <div class="p-grid"> 
   <div class="p-fluid p-formgrid p-grid p-col-12">
   <div class="p-field p-col-4">
   <label for="order_date"><b>Date Of Pharmacy Order*</b></label>
   <p-calendar id="order_date" [monthNavigator]="true" [yearNavigator]="true" yearRange="2000:2030"
   [(ngModel)]= "pharmacyExt.order_date"  #doo="ngModel" required
               inputId="navigators" [showIcon]="true" showButtonBar="true" required 
               dateFormat="dd/mm/yy" #doo="ngModel" [ngClass]="{'ng-dirty': (doo.invalid) || (doo.dirty && doo.invalid)}">
   </p-calendar>
   <small *ngIf="(doo.invalid) || (doo.dirty && doo.invalid)" class="p-error">
   Date of order is required</small>
   </div>
   <div class="p-field p-col-2">
   <label for="duration"><b>Duration*</b></label>
   <p-dropdown inputId="duration" [options]="drugDuration"
   optionLabel="name" placeholder="-Select-" [(ngModel)]="selectedDuration"
   [showTransitionOptions]="'0ms'" [hideTransitionOptions]="'0ms'" required (onChange)="getNextRefillDate()"
   #ddr="ngModel" [ngClass]="{'ng-dirty': (ddr.invalid) || (ddr.dirty && ddr.invalid)}">
   </p-dropdown>
   <small *ngIf="(ddr.invalid) || (ddr.dirty && ddr.invalid)" class="p-error">
 Choose the refill duration</small>
   </div>
   <div class="p-field p-col-4">
   <label for="next_refill_date"><b>Next refill date*</b></label>
   <p-calendar id="next_refill_date" [monthNavigator]="true" [yearNavigator]="true" yearRange="2000:2030"
   [(ngModel)]= "pharmacyExt.next_refill_date"  #nrd="ngModel" required disabled
               inputId="navigators" [showIcon]="true" showButtonBar="true" required
               dateFormat="dd/mm/yy" #nrd="ngModel" [ngClass]="{'ng-dirty': (nrd.invalid) || (nrd.dirty && nrd.invalid)}">
   </p-calendar>
   <small *ngIf="(nrd.invalid) || (nrd.dirty && nrd.invalid)" class="p-error">
   Next refill date is required</small>
   </div>
   <div class="p-field p-col-2">
   </div>
  <div class="p-col-4 p-md-2">
       <p-button label="Get Form" icon="pi pi-angle-right" iconPos="right" (click)="loadForm()"></p-button>
   </div>
   </div>

   <div class="p-col-12" *ngIf="formRendered">
   <formio [form]="customServiceForm" (submit)="onSubmit($event)"></formio>
 </div>

   </div>
     </ng-template>

     </p-card>
     `,
  styleUrls: ['./pharmacy-orders.component.scss'],
  providers:[MessageService,ConfirmationService]
})
export class PharmacyOrdersComponent implements OnInit {
  pharmacyExt = {} as PharmacyDataExt;
  customServiceForm: any;
  drugDuration: any[];
  formRendered: boolean = false;
  selectedDuration: any;

  constructor() { }

  ngOnInit(): void {
    this.drugDuration=[
      {name: 30},
      {name: 60},
      {name: 90},
      {name: 180},
    ]
  }

  loadForm(){
    if(this.pharmacyExt.order_date){
    this.customServiceForm = require('./drugorder.json');
    this.formRendered = true;
    }
  }

  getNextRefillDate(){
    let order_date = null;
    order_date = this.pharmacyExt.order_date;
    order_date.setDate(order_date.getDate() + this.selectedDuration.name);
    this.pharmacyExt.next_refill_date = order_date;
  
  }

}
