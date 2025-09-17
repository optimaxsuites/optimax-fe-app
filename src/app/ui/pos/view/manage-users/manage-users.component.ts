import { Component } from '@angular/core';

@Component({
  selector: 'app-manage-users',
  templateUrl: './manage-users.component.html',
  styleUrl: './manage-users.component.scss'
})
export class ManageUsersComponent {


  formSection: boolean = false;
  tableSection: boolean = true;
  deleteModal: boolean = false
  editUser: boolean = false;
  viewUser: boolean = false

  openForm(){

    this.formSection = !this.formSection
    this.tableSection = !this.tableSection

  }

  openDeleteModal() {
    this.deleteModal = !this.deleteModal
  }

  openEditform() {
    this.editUser = !this.editUser
    this.tableSection = !this.tableSection
    }
  
openViewUser() {
  this.viewUser = !this.viewUser
  this.tableSection =!this.tableSection
}
openViewEditForm() {
  this.viewUser = !this.viewUser
  this.editUser = !this.editUser

}

}
