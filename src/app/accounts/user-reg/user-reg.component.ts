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
  isOpen2 = false; 
  isOpen3 = false;

  visible: boolean = false;

  showDialog() {
      this.visible = true;
  }

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

  ngOnInit() {
    this.isOpen1 = true; // Ensure panel 1 is open by default
  }

  togglePanel1() {
    this.isOpen1 = true;
    this.isOpen2 = false;
    this.isOpen3 = false;

  }
  togglePanel2() {
    this.isOpen2 = true;
    this.isOpen1 = false;
    this.isOpen3 = false;
  }
  togglePanel3() {
    this.isOpen3 = true;
    this.isOpen2 = false;
    this.isOpen1 = false;
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
