import { Component } from '@angular/core';
// import { MatDialog } from '@angular/material/dialog';

interface Company {
  value: string;
  viewValue: string;
}
interface BusinessDetails {
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
}


interface Client {
  value: string;
  viewValue: string;
}

interface ClientDetails {
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
}

@Component({
  selector: 'app-invoice-modal',
  templateUrl: './invoice-modal.component.html',
  styleUrl: './invoice-modal.component.scss'
})
export class InvoiceModalComponent {
  showSecondComponent = false;
  selectedValue?: string;


  // constructor( private dialogRef: MatDialog ){}

  // onClose(){
  //   this.dialogRef.closeAll()
  // }


  toggleSecondComponent() {
      this.showSecondComponent = !this.showSecondComponent;
  }

  companies: Company[] = [
    {value: 'Centrifuge', viewValue: 'Centrifuge'},
    {value: 'GOP Gadgets', viewValue: 'GOP Gadgets'},
    {value: 'DeOne', viewValue: 'DeOne'},
  ];

  businessDetails: BusinessDetails = {
    name: '',
    address: '',
    phoneNumber: '',
    email: ''
  };

  updateBusinessInfo() {
    // Replace this logic with your actual business details fetching mechanism
    if (this.selectedValue === 'Centrifuge') {
      this.businessDetails = {
        name: 'Centrifuge Group',
        address: 'No 31 juju street, lagos road',
        phoneNumber: '09077556633',
        email: 'centrifuge@gmail.com'
      };
    } else if (this.selectedValue === 'GOP Gadgets') {
      // Add logic for GOP Gadgets
      this.businessDetails = {
        name: 'GOP Gadgets',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08144685954',
        email: 'gop@gmail.com'
      };
    } else if (this.selectedValue === 'DeOne') {
      // Add logic for DeOne
      this.businessDetails = {
        name: 'DeOne Gadgets',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08060393174',
        email: 'DeOne@gmail.com'
      };
    }
  }



  // client details

  clients: Client[] = [
    {value: 'MTN', viewValue: 'MTN'},
    {value: 'GLO', viewValue: 'GLO'},
    {value: 'Opay', viewValue: 'Opay'},
  ];

  clientDetails: ClientDetails = {
    name: '',
    address: '',
    phoneNumber: '',
    email: ''
  };

  updateClientInfo() {
    // Replace this logic with your actual business details fetching mechanism
    if (this.selectedValue === 'MTN') {
      this.clientDetails = {
        name: 'MTN',
        address: 'No 31 juju street, lagos road',
        phoneNumber: '09077556633',
        email: 'mtn@gmail.com'
      };
    } else if (this.selectedValue === 'GLO') {
      // Add logic for GOP Gadgets
      this.clientDetails = {
        name: 'GLO',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08144685954',
        email: 'glo@gmail.com'
      };
    } else if (this.selectedValue === 'Opay') {
      // Add logic for DeOne
      this.clientDetails = {
        name: 'Opay',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08060393174',
        email: 'opay@gmail.com'
      };
    }
  }


  



}





