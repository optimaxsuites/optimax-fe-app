import { Component } from '@angular/core';

@Component({
  selector: 'app-manage-users',
  templateUrl: './manage-users.component.html',
  styleUrl: './manage-users.component.scss'
})
export class ManageUsersComponent {
  formSection: boolean = false;
  tableSection: any = true;

  openForm(){
    this.formSection = !this.formSection
    this.tableSection = !this.tableSection
  }
}
