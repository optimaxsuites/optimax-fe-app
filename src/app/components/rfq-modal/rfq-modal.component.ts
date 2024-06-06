import { Component } from '@angular/core';

import { DataService } from '../../data.service';
import { ActivatedRoute, Router } from '@angular/router';

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

interface Field {
  text: string;
  isEditing: boolean;
}

@Component({
  selector: 'app-rfq-modal',
  templateUrl: './rfq-modal.component.html',
  styleUrl: './rfq-modal.component.scss',
})
export class RfqModalComponent {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rfqDataService: DataService
  ) {}

  selectedValue?: string;
  showLogo: boolean = false;
  logoUrl: string | ArrayBuffer | null = null;
  rfqId: any;
  rfqData: any;
  rfqNo: any = '';
  dateIssued: any = '';
  expiryDate: any = '';
  projectTitle: string = '';
  preparedBy: string = '';
  position: string = '';
  orgAddress: string = '';
  terms: any[] = [];
  termsGroup: any[] = [];
  charges: any[] = [];
  moreFields: any[] = [];
  rfq: any;
  name: string = '';
  partNumber: string = '';
  description: string = '';
  quantity: number = 0;
  imageUrl: string = '';
  approvedBudget: number = 0;
  selectedItemIndex: number | null = null;

  items: {
    name: string;
    partNumber: string;
    description: string;
    quantity: number;
    imageUrl: string;
    approvedBudget: number;
  }[] = [];

  previewImageUrl: string | null = null;

  addItem() {
    if (
      this.name &&
      this.partNumber &&
      this.description &&
      this.quantity &&
      this.imageUrl
    ) {
      this.items.push({
        name: this.name,
        partNumber: this.partNumber,
        description: this.description,
        quantity: this.quantity,
        imageUrl: this.imageUrl,
        approvedBudget: this.approvedBudget,
      });
    }

    localStorage.setItem('items', JSON.stringify(this.items));
    this.clearInputs();
  }

  editItem(item: any) {
    this.name = item.name;
    this.partNumber = item.partNumber;
    this.description = item.description;
    this.quantity = item.quantity;
    this.imageUrl = item.imageUrl;
    this.previewImageUrl = item.imageUrl; // For previewing the image
    this.approvedBudget = item.approvedBudget;

    // Store the index of the item being edited
    this.selectedItemIndex = this.items.indexOf(item);
  }

  updateItem() {
    if (this.selectedItemIndex !== null) {
      this.items[this.selectedItemIndex] = {
        name: this.name,
        partNumber: this.partNumber,
        description: this.description,
        quantity: this.quantity,
        imageUrl: this.imageUrl,
        approvedBudget: this.approvedBudget,
      };

      localStorage.setItem('items', JSON.stringify(this.items));
      this.clearInputs();
      this.selectedItemIndex = null; // Reset the selected item index
    }
  }

  deleteItem(item: any) {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.items.splice(index, 1);

      localStorage.setItem('items', JSON.stringify(this.items));

      if (this.selectedItemIndex === index) {
        this.clearInputs();
        this.selectedItemIndex = null;
      }
    }
  }

  saveAndContinue() {
    // Generate unique ID
    const rfqId = generateUniqueId();

    // Create new RFQ entry with the unique ID
    const newRfq = {
      id: rfqId,
      rfqNo: this.rfqNo,
      dateIssued: this.dateIssued,
      expiryDate: this.expiryDate,
      projectTitle: this.projectTitle,
      preparedBy: this.preparedBy,
      position: this.position,
      orgAddress: this.orgAddress,
    };

    // Store the RFQ entry in local storage
    let rfqData = JSON.parse(localStorage.getItem('rfqData') || '[]');
    rfqData.push(newRfq);
    localStorage.setItem('rfqData', JSON.stringify(rfqData));

    // Navigate to the RFQ component
    this.router.navigate(['/rfq']);
  }

  // saveAndContinue(): void {

  //   this.rfq.rfqNo = this.rfqNo;
  //   this.rfq.dateIssued = this.dateIssued;
  //   this.rfq.expiryDate = this.expiryDate;
  //   this.rfq.projectTitle = this.projectTitle;
  //   this.rfq.preparedBy = this.preparedBy;
  //   this.rfq.position = this.position;
  //   this.rfq.orgAddress = this.orgAddress;
  //   let rfqData = JSON.parse(localStorage.getItem('rfqData') || '[]');
  //   rfqData.push(this.rfq);
  //   localStorage.setItem('rfqData', JSON.stringify(rfqData));

  //   // Navigate back to the RFQ component
  //   this.router.navigate(['/rfq']);
  // }

  // saveAndContinue() {
  //   const newRfq = {
  //     rfqNo: this.rfqNo,
  //     dateIssued: this.dateIssued,
  //     expiryDate: this.expiryDate,
  //     projectTitle: this.projectTitle,
  //     preparedBy: this.preparedBy,
  //     position: this.position,
  //     orgAddress: this.orgAddress,
  //   };
  //   console.log(newRfq);
  //   let rfqData = JSON.parse(localStorage.getItem('rfqData') || '[]');
  //   rfqData.push(newRfq);
  //   localStorage.setItem('rfqData', JSON.stringify(rfqData));

  //   this.router.navigate(['/rfq']);
  // }

  // Function to clear input fields (assumed to be implemented already)

  clearInputs() {
    this.name = '';
    this.partNumber = '';
    this.description = '';
    this.quantity = 0;
    this.approvedBudget = 0;
    this.imageUrl = '';
  }

  removeLogo() {
    this.imageUrl = '';
    this.previewImageUrl = '';
    this.showLogo = false; // Optional, hide the preview element
  }

  onLogoSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Ensure reader.result is a string before assigning
        if (typeof reader.result === 'string') {
          this.imageUrl = reader.result;
          this.previewImageUrl = reader.result;
          this.showLogo = true;
        } else {
          console.error(
            'Unexpected file reading error: result is not a string'
          );
        }
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        // Display an error message to the user (optional)
      };
    }
  }

  saveField(index: number, event: any) {
    this.fields[index].isEditing = false;
    this.fields[index].text = event.target.value;
  }

  addField() {
    this.fields.push({ text: 'New field', isEditing: false });
  }

  removeField(index: number) {
    this.fields.splice(index, 1);
  }

  editField(index: number) {
    this.fields[index].isEditing = true;
  }

  fields: Field[] = [
    // { text: 'Click to edit me', isEditing: false }
  ];

  ngOnInit(): void {
    this.rfq = {};
    const storedItems = localStorage.getItem('items');
    if (storedItems) {
      this.items = JSON.parse(storedItems);
    }

   
  }

  companies: Company[] = [
    { value: 'Centrifuge', viewValue: 'Centrifuge' },
    { value: 'GOP Gadgets', viewValue: 'GOP Gadgets' },
    { value: 'DeOne', viewValue: 'DeOne' },
  ];

  businessDetails: BusinessDetails = {
    name: '',
    address: '',
    phoneNumber: '',
    email: '',
  };

  updateBusinessInfo() {
    // Replace this logic with your actual business details fetching mechanism
    if (this.selectedValue === 'Centrifuge') {
      this.businessDetails = {
        name: 'Centrifuge Group',
        address: 'No 31 juju street, lagos road',
        phoneNumber: '09077556633',
        email: 'centrifuge@gmail.com',
      };
    } else if (this.selectedValue === 'GOP Gadgets') {
      // Add logic for GOP Gadgets
      this.businessDetails = {
        name: 'GOP Gadgets',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08144685954',
        email: 'gop@gmail.com',
      };
    } else if (this.selectedValue === 'DeOne') {
      // Add logic for DeOne
      this.businessDetails = {
        name: 'DeOne Gadgets',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08060393174',
        email: 'DeOne@gmail.com',
      };
    }
  }
}

function generateUniqueId(): string {
  // Generate a unique ID using a timestamp and a random number
  const timestamp = Date.now().toString(36);
  const randomNumber = Math.random().toString(36).substr(2, 5); // Substring to get a fixed length
  return timestamp + randomNumber;
}
