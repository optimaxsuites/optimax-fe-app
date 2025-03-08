import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { MenuItemsService } from '../../../sharedComponents/service/menue-items/menu-items.service';


// interface Permission {
//   view: boolean;
//   edit: boolean;
//   delete: boolean;
//   create: boolean;
// }

// interface Role {
//   roleName: string;
//   permissions: {
//     [key: string]: Permission;
//   };
//   usersAssigned?: { id: number; name: string; email: string }[];
// }
interface Permission {
  view: boolean;
  edit: boolean;
  delete: boolean;
  create: boolean;
}

interface ModulePermissions {
  [formName: string]: Permission;
}

interface Role {
  roleName: string;
  permissions: {
    [moduleName: string]: ModulePermissions;
  };
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
        pos: {
          sales: { view: true, edit: true, delete: true, create: true },
          inventory: { view: true, edit: true, delete: true, create: true },
          product: { view: true, edit: true, delete: true, create: true },
          report: { view: true, edit: true, delete: true, create: true },
        },
        hr: {
          employee: { view: true, edit: true, delete: true, create: true },
          leave: { view: true, edit: true, delete: true, create: true },
          attendance: { view: true, edit: true, delete: true, create: true },
          loan: { view: true, edit: true, delete: true, create: true },
          payroll: { view: true, edit: true, delete: true, create: true },
        },
      },
      isEditing: false,
    },
    {
      roleName: 'Cashier',
      permissions: {
        pos: {
          sales: { view: true, edit: true, delete: false, create: true },
          inventory: { view: false, edit: false, delete: false, create: false },
          product: { view: false, edit: false, delete: false, create: false },
          report: { view: true, edit: false, delete: false, create: true },
        }
      },
      isEditing: false,
    },
    {
      roleName: 'Inventory Manager',
      permissions: {
        pos: {
          sales: { view: false, edit: false, delete: false, create: false },
          inventory: { view: true, edit: true, delete: true, create: true },
          product: { view: true, edit: true, delete: true, create: true },
          report: { view: false, edit: false, delete: false, create: false },
        },
        hr: {
          employee: { view: false, edit: false, delete: false, create: false },
          leave: { view: false, edit: false, delete: false, create: false },
          attendance: { view: false, edit: false, delete: false, create: false },
          loan: { view: false, edit: false, delete: false, create: false },
        },
      },
      isEditing: false,
    },
  ];
  
  modules:{ name: string; forms: string[]; }[] = []
  newRole: Role = {
    roleName: '',
    permissions: {
    },
  };

  permissionKeys = Object.keys(this.newRole.permissions);
  Object = Object

  constructor(private messageService: MessageService, private menuService: MenuItemsService){
  }

  ngOnInit(){
    this.modules = this.menuService.getUnlockedModulesRole()
    this.initializePermissions();
    console.log(this.newRole) 
  }

  initializePermissions() {
    this.modules.forEach((module) => {
      this.newRole.permissions[module.name] = {};
      module.forms.forEach((form) => {
        this.newRole.permissions[module.name][form] = {
          view: false,
          edit: false,
          delete: false,
          create: false,
        };
      });
    });
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
       
      }
     
    }
    this.initializePermissions();

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
    return Object.keys(permissions).some(moduleKey =>
      Object.keys(permissions[moduleKey]).some(permissionKey =>
        Object.values(permissions[moduleKey][permissionKey]).includes(true)
      )
    );
  }
  
  
}
