import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { MenuItemsService } from '../../../sharedComponents/service/menue-items/menu-items.service';
import { ModulesService } from '../../../service/modules.service';
import { forkJoin } from 'rxjs';


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
  id: number,
  roleName: string;
  roleDescription?: string;
  appRolePermissionList: any
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
  ];
  
  modules:any = []
  newRole: Role = {
    id: 0,
    roleName: '',
    roleDescription: "",
    appRolePermissionList: [],
    permissions: {
    },
  };

  permissionKeys = Object.keys(this.newRole.permissions);
  Object = Object

  constructor(private messageService: MessageService, private menuService: MenuItemsService, private moduleService: ModulesService){
  }

  ngOnInit(){
    this.moduleService.getModules().subscribe({
      next: (data) => {
        this.modules = data
    this.initializePermissions();

      },
      error: (err) => {
        console.log(err)
      }
    })
    this.moduleService.getRoles().subscribe((apiRoles: any[]) => {
      console.log(apiRoles)
      this.roles = apiRoles.map(role => {
        const permissions: any = {};
    
        for (const perm of role.appRolePermissionList) {
          const moduleTitle = this.getModuleTitleById(perm.appRegister.moduleId);
          const appName = perm.appRegister.appName;
    
          if (!permissions[moduleTitle]) {
            permissions[moduleTitle] = {};
          }
    
          permissions[moduleTitle][appName] = {
            canView: perm.canView,
            canEdit: perm.canUpdate,
            canDelete: perm.canDelete,
            canCreate: perm.canCreate,
            superuser: perm.superuser
          };
        }
    
        return {
          id: role.id,
          roleName: role.name,
          roleDescription: role.description,
          appRolePermissionList: role.appRolePermissionList,
          permissions,
          isEditing: false
        };
      });
    });
    
    
  }

  initializePermissions() {
    this.modules.forEach((module: { title: string; appRegister: any[] }) => {
      this.newRole.permissions[module.title] = {};
  
      module.appRegister.forEach((app) => {
        this.newRole.permissions[module.title][app.appName] = {
          canView: false,
          canEdit: false,
          canDelete: false,
          canCreate: false,
          superuser: false
        };
      });
    });

    console.log(this.newRole)
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
    $event.stopPropagation();

      if (role.isEditing) {
        this.saveEditedRole(role);
      } else {
        role.isEditing = true; 
      }
  }

  saveEditedRole(role: any) {
    const updatedPermissions: any[] = [];
  
    for (const moduleTitle in role.permissions) {
      const forms = role.permissions[moduleTitle];
      const module = this.modules.find((m: any) => m.title === moduleTitle);

      console.log(forms)
      console.log(module)

  
      if (!module || !forms) continue;
  
      for (const formName in forms) {
        const perm = forms[formName];
      console.log(perm)

        const appRegister = module.appRegister.find((app: any) => app.appName === formName);
      console.log(appRegister)

  
        if (!appRegister) continue;
  
        const existingPerm = role.appRolePermissionList.find((p: any) => p.appRegister.id === appRegister.id);
  
        updatedPermissions.push({
          id: existingPerm?.id || 0,
          canView: perm.canView,
          canCreate: perm.canCreate,
          canDelete: perm.canDelete,
          canUpdate: perm.canEdit,
          superuser: perm.superuser,
          appRoleId: role.id,
          appRegister: {
            id: appRegister.id,
            appName: appRegister.appName,
            appCode: appRegister.appCode,
            description: appRegister.description,
            moduleId: appRegister.moduleId,
          }
        });
      }
    }
    console.log(updatedPermissions)
  
    const updateRequests = updatedPermissions.map(permission =>
      this.moduleService.createRolePermissions(permission).toPromise()
    );
  
    Promise.all(updateRequests)
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: `Role permissions updated successfully`,
          key: 'tl',
          life: 3000,
        });
        role.isEditing = false;
      })
      .catch(() => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to update some role permissions`,
          key: 'tl',
          life: 3000,
        });
      });
  }
  
  
  // submitRole() {
  //   if (this.newRole.roleName && this.validatePermissions(this.newRole.permissions)) {
  //     const rolePermission = {
  //       name: this.newRole.roleName,
  //       roleDescription: this.newRole.roleDescription,
  //       permissions: this.newRole.permissions,
  //     }

  //     console.log(rolePermission)
  //     this.roles.push({...this.newRole, isEditing: false });
  //     this.newRole = {
  //     roleName: '',
  //     permissions: {
       
  //     }
     
  //   }
  //   this.initializePermissions();

  //   this.messageService.add({
  //     severity: 'success',
  //     summary: 'Success',
  //     detail: `Roles created successfully`,
  //     key: 'tl',
  //     life: 3000,
  //   })

  //   this.showAddForm = false
  //   } else {
  //     this.messageService.add({
  //       severity: 'warn',
  //       summary: 'Note',
  //       detail: `A role should have at least one permission.`,
  //       key: 'tl',
  //       life: 3000,
  //     })
  //   }
  // }

  submitRole() {
    if (!this.newRole.roleName || !this.newRole.roleDescription) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Note',
        detail: `Role name and description are required.`,
        key: 'tl',
        life: 3000,
      });
      return;
    }
  
    const rolePayload = {
      name: this.newRole.roleName,
      code: this.newRole.roleName.toUpperCase().replace(/\s+/g, '_'),
      description: this.newRole.roleDescription
    };
  
    this.moduleService.createRole(rolePayload).subscribe({
      next: (createdRole: any) => {
        const roleId = createdRole.id;
  
        const permissionRequests = [];
  
        for (const moduleTitle in this.newRole.permissions) {
          const forms = this.newRole.permissions[moduleTitle];
  
          if (forms) {
            for (const formName in forms) {
              const perm = forms[formName];
  
              const module = this.modules.find((m: any) => m.title === moduleTitle);
              const appRegister = module?.appRegister?.find((app: any) => app.appName === formName);
  
              if (appRegister) {
                const permissionPayload = {
                  id: 0,
                  canView: perm.canView,
                  canCreate: perm.canCreate,
                  canDelete: perm.canDelete,
                  canUpdate: perm.canEdit,
                  superuser: perm.superuser,
                  appRoleId: roleId,
                  appRegister: {
                    id: appRegister.id,
                    appName: appRegister.appName,
                    appCode: appRegister.appCode,
                    description: appRegister.description,
                    moduleId: appRegister.moduleId
                  }
                };
                permissionRequests.push(this.moduleService.createRolePermissions(permissionPayload));
              }
            }
          }
        }
        forkJoin(permissionRequests).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `Role and permissions created successfully`,
              key: 'tl',
              life: 3000,
            });
  
            this.roles.push({ ...this.newRole, isEditing: false });
            this.newRole = { roleName: '', roleDescription: '', permissions: {},  appRolePermissionList:[], id: 0 };
            this.initializePermissions();
            this.showAddForm = false;
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `Failed to save one or more role permissions`,
              key: 'tl',
              life: 3000,
            });
          }
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to create role.`,
          key: 'tl',
          life: 3000,
        });
      }
    });
  }
  
  
  

  validatePermissions(permissions: any) {
    return Object.keys(permissions).some(moduleKey =>
      Object.keys(permissions[moduleKey]).some(permissionKey =>
        Object.values(permissions[moduleKey][permissionKey]).includes(true)
      )
    );
  }
  
  getPermissionValue(value: unknown): {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canCreate: boolean;
  } {
    return value as {
      canView: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canCreate: boolean;
    };
  }

  getModuleTitleById(moduleId: number): string {
    const module = this.modules.find((mod: any) =>
      mod.appRegister?.some((app: any) => app.moduleId === moduleId)
    );
    return module?.title || 'Unknown';
  }
  
  

  
}
