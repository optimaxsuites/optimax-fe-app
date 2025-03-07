import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';


interface Permission {
  view: boolean;
  edit: boolean;
  delete: boolean;
  create: boolean;
}

interface Role {
  roleName: string;
  permissions: {
    [key: string]: Permission;
  };
  usersAssigned?: { id: number; name: string; email: string }[];
  isEditing?: boolean,
}

@Component({
  selector: 'app-roles-npermission',
  templateUrl: './roles-npermission.component.html',
  styleUrl: './roles-npermission.component.scss'
})


export class RolesNpermissionComponent {

  showAddForm: boolean =false;
  isEditing = false;
  editIndex: number | undefined = undefined;

  roles: Role[] = [
    {
      roleName: 'Admin',
      permissions: {
        sales: { view: true, edit: true, delete: true, create: true },
        inventory: { view: true, edit: true, delete: true, create: true },
        product: { view: true, edit: true, delete: true, create: true },
        report: { view: true, edit: true, delete: true, create: true }
      },
      usersAssigned: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
        { id: 3, name: 'Michael Brown', email: 'michael@example.com' }
      ],
      isEditing: false,
    },
    {
      roleName: 'Cashier',
      permissions: {
        sales: { view: true, edit: true, delete: false, create: true },
        inventory: { view: false, edit: false, delete: false, create: false },
        product: { view: false, edit: false, delete: false, create: false },
        report: { view: true, edit: false, delete: false, create: true }
      },
      usersAssigned: [
        { id: 4, name: 'Emily Davis', email: 'emily@example.com' },
        { id: 5, name: 'Daniel Wilson', email: 'daniel@example.com' }
      ],
      isEditing: false,
    },
    {
      roleName: 'Inventory Manager',
      permissions: {
        sales: { view: false, edit: false, delete: false, create: false },
        inventory: { view: true, edit: true, delete: true, create: true },
        product: { view: true, edit: true, delete: true, create: true },
        report: { view: false, edit: false, delete: false, create: false }
      },
      usersAssigned: [
        { id: 6, name: 'Sophia Martinez', email: 'sophia@example.com' },
        { id: 7, name: 'Liam Johnson', email: 'liam@example.com' }
      ],
      isEditing: false,
    }
  ];

  newRole: Role = {
    roleName: '',
    permissions: {
      sales: { view: false, edit: false, delete: false, create: false },
      inventory: { view: false, edit: false, delete: false, create: false },
      product: { view: false, edit: false, delete: false, create: false },
      report: { view: false, edit: false, delete: false, create: false },
    },
  };

  permissionKeys = Object.keys(this.newRole.permissions);
  Object = Object

  constructor(private messageService: MessageService){

  }
  toogleForm() {
    this.showAddForm =!this.showAddForm
    if(this.isEditing && this.showAddForm){
      // this.compensationForm.reset();
      this.isEditing = false
      this.editIndex = undefined
    }
  }

  confirmCompensationDelete(arg0: any,$event: MouseEvent) {
    throw new Error('Method not implemented.');
    }
    editCompensation(role: any,$event: MouseEvent) {
      $event.stopPropagation()
      role.isEditing = !role.isEditing 


    }


  submitRole() {
    if (this.newRole.roleName && this.validatePermissions(this.newRole.permissions)) {
      this.roles.push({...this.newRole, isEditing: false });
      this.newRole = {
      roleName: '',
      permissions: {
        sales: { view: false, edit: false, delete: false, create: false },
        inventory: { view: false, edit: false, delete: false, create: false },
        product: { view: false, edit: false, delete: false, create: false },
        report: { view: false, edit: false, delete: false, create: false },
      }
     
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: `Roles created successfully`,
      key: 'tl',
      life: 3000,
    })

    this.showAddForm = false
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Note',
        detail: `A role should have at least one permission.`,
        key: 'tl',
        life: 3000,
      })
    }
  }

  validatePermissions(permissions: any) {
    return Object.keys(permissions).some((key) =>
      Object.values(permissions[key]).includes(true)
    );
  }
  
}
