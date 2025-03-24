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
  canView: boolean,
  canEdit: boolean,
  canDelete: boolean,
  canCreate: boolean,
  superuser?: boolean
}

interface ModulePermissions {
  [formName: string]: Permission;
}

interface Role {
  roleName: string;
  roleDescription?: string;
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
          sales: { canView: true, canEdit: true, canDelete: true, canCreate: true },
          inventory: { canView: true, canEdit: true, canDelete: true, canCreate: true },
          product: { canView: true, canEdit: true, canDelete: true, canCreate: true },
          report: { canView: true, canEdit: true, canDelete: true, canCreate: true },
        },
        hr: {
          employee: { canView: true, canEdit: true, canDelete: true, canCreate: true },
          leave: { canView: true, canEdit: true, canDelete: true, canCreate: true },
          attendance: { canView: true, canEdit: true, canDelete: true, canCreate: true },
          loan: { canView: true, canEdit: true, canDelete: true, canCreate: true },
          payroll: { canView: true, canEdit: true, canDelete: true, canCreate: true },
        },
      },
      isEditing: false,
    },
    {
      roleName: 'Cashier',
      permissions: {
        pos: {
          sales: { canView: true, canEdit: true, canDelete: false, canCreate: true },
          inventory: { canView: false, canEdit: false, canDelete: false, canCreate: false },
          product: { canView: false, canEdit: false, canDelete: false, canCreate: false },
          report: { canView: true, canEdit: false, canDelete: false, canCreate: true },
        }
      },
      isEditing: false,
    },
    {
      roleName: 'Inventory Manager',
      permissions: {
        pos: {
          sales: { canView: false, canEdit: false, canDelete: false, canCreate: false },
          inventory: { canView: true, canEdit: true, canDelete: true, canCreate: true },
          product: { canView: true, canEdit: true, canDelete: true, canCreate: true },
          report: { canView: false, canEdit: false, canDelete: false, canCreate: false },
        },
        hr: {
          employee: { canView: false, canEdit: false, canDelete: false, canCreate: false },
          leave: { canView: false, canEdit: false, canDelete: false, canCreate: false },
          attendance: { canView: false, canEdit: false, canDelete: false, canCreate: false },
          loan: { canView: false, canEdit: false, canDelete: false, canCreate: false },
        },
      },
      isEditing: false,
    },
  ];
  
  modules:{ name: string; forms: string[]; }[] = []
  newRole: Role = {
    roleName: '',
    roleDescription: "",
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
          canView: false,
          canEdit: false,
          canDelete: false,
          canCreate: false,
          superuser: false
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
      const rolePermission = {
        name: this.newRole.roleName,
        roleDescription: this.newRole.roleDescription,
        permissions: this.newRole.permissions,
      }

      console.log(rolePermission)
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
