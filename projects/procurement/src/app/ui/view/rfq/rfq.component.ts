import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-rfq',
  templateUrl: './rfq.component.html',
  styleUrl: './rfq.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class RfqComponent {
  activeItem: any = {}
  isEdit?: boolean;
  searchTerm: any;
  rfqlist: any[] = [
    {id: 1, projectTitle: 'For Weekend deals', rfqNo: "dhddj47584h", date: '23-04-2024', dueDate: '02-05-2024' },
    {id: 2, projectTitle: 'For weekday deals', rfqNo: "56789oihgd6e", date: '09-04-2024', dueDate: '15-04-2024' }

  ];
  rfqTable: boolean = true;
  rfqForm: boolean = false;

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ){}

  getStatusClass(stage: string) {
    switch (stage) {
      case 'Created':
        return 'badge badge-lightgrey';
      case 'Sent':
        return 'badge badge-lightgreen';
      default:
        return '';
    }
  }

  editRfq(item: any) {
    console.log("rfq info", item)
    this.activeItem = { ...item };
    this.isEdit = true; 
    this.rfqTable = false
    this.rfqForm = true
  }
  search() {
    throw new Error('Method not implemented.');
  }
  openForm() {
    this.rfqTable = false
    this.rfqForm = true
  }

  close() {
    this.rfqTable = true
    this.rfqForm = false
    this.activeItem = {}; 
  }

}
