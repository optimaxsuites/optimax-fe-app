import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthenticationService } from '../../../sharedComponents/service/auth-service/authentication.service';
import { environment } from '../../../sharedComponents/service/environments/environment.prod';
import { Router } from '@angular/router';
import { NavigationLinksService } from '../../../sharedComponents/service/navigation-links/navigation-links.service';
import { ModulesService } from '../../../service/modules.service';
import { UserService } from '../../../sharedComponents/service/user.service';

 import { forkJoin, map } from 'rxjs';


interface user {
  name: string;
  email: string;
  status: string;
  dateCreated: string;
  password: string;
  permission: {
    [key: string]: string;
  };
  isEditing?:boolean,
  authType: string, 
  accessCode: string,
}
@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
filterBySelectedEmployeeType() {
throw new Error('Method not implemented.');
}
filterBySelectedPosition() {
throw new Error('Method not implemented.');
}
applyFilters() {
throw new Error('Method not implemented.');
}
codeAuthType: boolean = false
openAddForm: boolean = false
uniqueLevels = ['admin', 'checkout', 'inventory manager']
uniquePositions = ['POS', 'Human resources', 'Office productivity']
selectedPosition: any;
selectedEmployeeType: any;
searchTerm: any;
filteredUsers: any[] = [];
Object = Object
autoGenerateCode: boolean = true;
autoVerify: boolean = false;
users: any[] = [
 
 
];

newUser: user ={
  name: '',
  email: '',
  status: 'Active',
  dateCreated: '',
  password: '',
  permission: {
    
  },
  authType: 'password', 
  accessCode: '',
}
selectedModule: string = ''; 
selectedRole: any = {};
roles: any[] = []

constructor(private confirmationService: ConfirmationService, private messageService: MessageService, private authenticationService: AuthenticationService,     private router: Router,
  private navigationLink: NavigationLinksService, private moduleService: ModulesService, private userService: UserService){

}

ngOnInit(){
   this.moduleService.getRoles().subscribe( {
     next: (data: any[]) => {
      this.roles = data
     },
     error(err) {
      console.log(err)
     } 
    });

    this.fetchUsers()
}

fetchUsers(){
  this.userService.getUsers().subscribe({
    next: (data) => {
      this.users = data.map((user: { id: number; }) => ({
      ...user,
      appRoles$: this.authenticationService.getUserApplicationRole(user.id).pipe(
        map(((roleObj: any) => roleObj?.appRole.name ?? ''))
      ),
      appRolesId$: this.authenticationService.getUserApplicationRole(user.id).pipe(
        map(((roleObj: any) => roleObj?.appRole.id ?? ''))
      )
    }));

    },
    error(err){
      console.log(err)
    }
  })
}
   updateRole(permission: any){
    if (this.selectedModule && this.selectedRole) {
      permission[this.selectedModule] = this.selectedRole;
    this.selectedModule = ''
    this.selectedRole = []
    }
   }

   revokeRole(user: any, moduleKey: string) {
  
      delete user.permission[moduleKey];

   
  }

  onAuthTypeChange() {

    this.codeAuthType = !this.codeAuthType
  }

  removePermission(module: string): void {
    delete this.newUser.permission[module];
  }

   isFormValid(): boolean {
    if (!this.newUser.name.trim()) {
      return false;
    }

    if (this.newUser.authType === 'password') {
      return this.newUser.email.trim() !== '' && this.newUser.password.trim() !== '';
    } else if (this.newUser.authType === 'code') {
      return this.newUser.accessCode.trim() !== '';
    }

    return false;
  }

  generateRandomCode(): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.newUser.accessCode = result;
  }




submitUser() {
  const signupDetails = {
    username: this.newUser.name,
    password: this.newUser.password,
    email: this.newUser.email,
    project: `${environment.project}`,
    apiKey: `${environment.apiKey}`
  };

  this.authenticationService.userRegistration(signupDetails).subscribe({
    next: (data) => {
      // Prepare requests for each role
      const roleRequest = {
          userId: data.id,
          appRoleId: this.selectedRole?.id
        }
      

      // Run all role requests in parallel and wait for completion
      this.authenticationService.userApplicationRole(roleRequest).subscribe({
        next: () => {
          if (this.codeAuthType) {
            this.authenticationService.codeActivation(data.ecode, true).subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: 'User registered and eCode activated successfully!'
                });
              },
              error: (err) => {
                console.error(err);
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Failed to activate user eCode, try again later!'
                });
              }
            });
          } else {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'User registered and roles assigned successfully!'
            });
          }
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to assign roles to user, try again later!'
          });
        }
      });
    },
    error: (error) => {
      if (error.toString() == '400') {
        this.messageService.add({
          severity: 'error',
          summary: 'Registration Failed',
          detail: 'Your account has not been verified. Check your mail to verify!'
        });
      } else if (error.toString() == '409') {
        this.messageService.add({
          severity: 'error',
          summary: 'Registration Failed',
          detail: 'Email address is already registered. Please use a different email or login.'
        });
      } else if (error.toString() == '0') {
        this.messageService.add({
          severity: 'error',
          summary: 'Registration Failed',
          detail: 'Unable to connect to the server. Please check your internet connection.'
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Registration Failed',
          detail: 'An unexpected error occurred. Please try again later.'
        });
      }
    }
  });
}

assignRole(user: any, event: any) {
  user.appRolesId$.subscribe((appRoleId: number) => {
    const roleRequest = {
      id: appRoleId,
      userId: user.id,
      appRoleId: this.selectedRole?.id
    };

    this.authenticationService.userApplicationRole(roleRequest).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Role assigned successfully!'
        });
        this.editCompensation(user, event);
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to assign role, try again later!'
        });
      }
    });
  });
}



    updateUser(user: any) {
      console.log('invoked')
      console.log(Object.keys(user.permission).length)
      if(Object.keys(user.permission).length >= 1){
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'User updated successfully ',
          key: 'tl', life: 3000 
        })
        user.isEditing = false
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'User must be assigned at least a role ',
          key: 'tl', life: 3000 
        })
      }
    }  
  confirmDeleteUser(user: any, event: Event) {
    event.stopPropagation()

    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of ${user.username}'s salary structure`,
      header: `Delete user - ${user.username}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass:"p-btn-danger p-button-text",
      rejectButtonStyleClass:"p-btn-cancel p-button-text",
      acceptIcon:"none",
      rejectIcon:"none",
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      // styleClass: 'custom-confirm-dialog',
      accept: () => {
        this.deleteUser(user);
      },
      reject: () => {

      }
    });
  }

  deleteUser(user: any){
    this.userService.deleteUsers(user.id).subscribe({
      next: (value) => {
       this.users = this.users.filter((u: any) => u.username!== user.username);
        
      },
      error(err){
        console.log(err)
      }
    })
  }
  confirmCompensationDelete(arg0: any,$event: MouseEvent) {
    throw new Error('Method not implemented.');
    }
    editCompensation(role: any,$event: MouseEvent) {
      $event.stopPropagation()
      if(role.isEditing){
        this.updateUser(role);
       
      }else{
        role.isEditing = !role.isEditing 

      }


    }

    attachModuleToRole() {
      if (this.selectedModule && this.selectedRole) {
        // this.newUser.permission[this.selectedModule] = this.selectedRole;
    
        this.selectedModule = '';
        this.selectedRole = [];
    
        console.log("Updated User Permissions:", this.newUser.permission);
      } else {
        alert("Please select both a module and a role.");
      }
    }

   getRoleNames(user: any): string {
  return user?.roles?.map((r: any) => r.name).join(", ") ?? '';
}

getSelectedRoleNames(){
  return this.selectedRole.map((role: any) => role.name).join(", ");
}

activateUser(user: any, $event: any){
      $event.stopPropagation()
      const status = user.allowEcodeAuth ? false : true;
      this.authenticationService.codeActivation(user.ecode, status).subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: 'User registered and eCode activated successfully!'
                });
      },
    })
}

getAppRoleNames(user: any) {
  // this.authenticationService.getUserApplicationRole(user.id).subscribe({
  //   next: (response) => {
  //     console.log("User application role:", response);
  //     return response?.map((r: any) => r.name).join(", ") ?? '';
  //   },
  //   error: (error) => {
  //     console.error("Error fetching user application role:", error);
  //   }
  // })

  // return user?.roles?.map((r: any) => r.name).join(", ") ?? '';

}

}
