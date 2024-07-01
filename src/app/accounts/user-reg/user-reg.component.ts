import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-user-reg',
  templateUrl: './user-reg.component.html',
  styleUrl: './user-reg.component.scss',
  providers: [MessageService]
})
export class UserRegComponent {
  items: any;
  isOpen1 = false;
  isOpen2 = false; isOpen3 = false;

  constructor(private messageService: MessageService){
    this.items = [
      {
          label: 'Update',
          command: () => {
              this.update();
          }
      },
      {
          label: 'Delete',
          command: () => {
              this.delete();
          }
      },
    ];
  }

  togglePanel1() {
    this.isOpen1 = !this.isOpen1;
  }
  togglePanel2() {
    this.isOpen2 = !this.isOpen2;
  }
  togglePanel3() {
    this.isOpen3 = !this.isOpen3;
  }




  save(severity: string) {
    this.messageService.add({ severity: severity, summary: 'Success', detail: 'Data Saved' });
  }

  update() {
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Data Updated' });
  }

  delete() {
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Data Deleted' });
  }

}
