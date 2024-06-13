import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    template:
    `<p-card>
    <ng-template pTemplate="title">
        Biometric Information
    </ng-template>
    <ng-template pTemplate="content">

<div class="card">
    <h5>Device Config</h5>
    <div class="p-grid">
        <div class="p-col-5 p-jc-center">
            <div class="p-fluid">
                <div class="p-field">
                    <label for="username">Device Name</label>
                    <p-dropdown optionValue="name" [options]="devicenames"
                    optionLabel="name" optionValue="id"
  placeholder="-Select-">
  </p-dropdown>

                </div>
                <div class="p-field">
                <label for="username">USB Device:</label>
                <p-dropdown optionValue="name" [options]="usbdevice"
                optionLabel="name" optionValue="id"
placeholder="-Select-">
</p-dropdown>
                </div>

                <div class="p-field">
                <label for="imagequality">Image Quality. Set ratio to {{imagequality}}%</label>
                <p-slider [(ngModel)]="imagequality"></p-slider>
                </div>
                <div class="p-field">
                <label for="timeout">Time out (if applicable): {{timeoutseconds}}s</label>
                <p-slider [(ngModel)]="timeoutseconds"></p-slider>
                </div>

                <p-button label="Initialize"></p-button>


                </div>
        </div>
        <div class="p-col-2">
            <p-divider layout="vertical">
            <i class="pi pi-user p-mr-2"></i>
            </p-divider>
        </div>


        <div class="p-col-5 p-d-flex p-ai-center p-jc-center">

        <div class="p-mb-3">
        <img src="assets/demo/images/product/" class="product-image" height:150px width:150px/>
        </div>
        <p-button label="Capture"></p-button>
        </div>
    </div>
</div>
</ng-template>

    <ng-template pTemplate="footer">
    <div class="p-grid p-nogutter p-justify-between">
    <p-button label="Back" (onClick)="prevPage()" icon="pi pi-angle-left"></p-button>
        <p-button label="Next" (onClick)="nextPage()" icon="pi pi-angle-right" iconPos="right"></p-button>
    </div>
</ng-template>
</p-card>`

})
export class BiometricInfoDetailComponent implements OnInit {
  devicenames: any[];
  usbdevice: any[];
  imagequality: number = 50;
  timeoutseconds: number = 10;

  constructor(private router: Router){}
  ngOnInit() {
      this.devicenames = [
          {
              name: "Auto",
              id: "auto"
          },
          {
              name: "FDU04",
              id: "fdu04"
          },
          {
              name: "FDU03",
              id: "fdu03"
          },
          {
              name: "FDU02",
              id: "fdu02"
          }
      ]

      this.usbdevice = [
          {
              name: "USB_AUTO_DETECT",
              id: "0"
          },
          {
              name: "1",
              id: "1"
          },
          {
              name: "2",
              id: "2"
          },
          {
              name: "3",
              id: "3"
          },
          {
              name: "4",
              id: "4"
          },
          {
              name: "5",
              id: "5"
          }
      ]
  }

  nextPage() {
      this.router.navigate(['eReg/esummary']);
  }

  prevPage() {
      this.router.navigate(['eReg/enextofkin']);
  }
}
