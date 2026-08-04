import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthenticationService } from '../../../sharedComponents/service/auth-service/authentication.service';
import { environment } from '../../../sharedComponents/service/environments/environment.prod';
import { Router } from '@angular/router';
import { NavigationLinksService } from '../../../sharedComponents/service/navigation-links/navigation-links.service';
import { ModulesService } from '../../../service/modules.service';
import { UserService } from '../../../sharedComponents/service/user.service';

import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { getLimitsForModule } from '../../pos/branches/branches.component';
import { DataService } from '../../../service/data.service';


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
  accountState?: string,
  roles?: any[],
  id?: number,
  ecode?: string,
  allowEcodeAuth?: boolean,
  username?: string,
}


interface Branch {
  id: number;
  name: string;
  description: string;
  address: string;
  phoneNo: number;
}

interface UserWithExtras extends user {
  appRoles$: Observable<string>;
  appRolesId$: Observable<number | ''>;
  userBranchName$: Observable<string>;
  userBranchId$: Observable<number | ''>;
}


@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
private runFilters(): void {
  let result = [...this.users];
  const term = (this.searchTerm || '').toLowerCase().trim();
  if (term) {
    result = result.filter((u: any) =>
      (u.username || u.name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term)
    );
  }
  this.filteredUsers = result;
  this.currentPage = 1;
}

filterBySelectedEmployeeType() { this.runFilters(); }
filterBySelectedPosition() { this.runFilters(); }
applyFilters() { this.runFilters(); }
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

isLoading: boolean = false;

currentPage = 1;
pageSize = 10;

get totalPages(): number {
  return Math.ceil(this.filteredUsers.length / this.pageSize) || 1;
}

get pagedUsers(): UserWithExtras[] {
  const start = (this.currentPage - 1) * this.pageSize;
  return this.filteredUsers.slice(start, start + this.pageSize) as UserWithExtras[];
}

get pageNumbers(): number[] {
  const total = this.totalPages;
  const current = this.currentPage;
  const range: number[] = [];
  const delta = 2;
  for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
    range.push(i);
  }
  return range;
}

goToPage(page: number): void {
  if (page >= 1 && page <= this.totalPages) this.currentPage = page;
}

prevPage(): void { this.goToPage(this.currentPage - 1); }
nextPage(): void { this.goToPage(this.currentPage + 1); }
minVal(a: number, b: number): number { return Math.min(a, b); }

newUser: user ={
  // fullname: '',
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
branches: any[] = []
selectedBranch: any = null;

userLimit = 0;

resetPasswordModal = { visible: false, user: null as any, newPassword: '', confirmPassword: '', loading: false };

openResetPasswordModal(user: any, event: Event): void {
  event.stopPropagation();
  this.resetPasswordModal = { visible: true, user, newPassword: '', confirmPassword: '', loading: false };
}

closeResetPasswordModal(): void {
  this.resetPasswordModal = { visible: false, user: null, newPassword: '', confirmPassword: '', loading: false };
}

submitResetPassword(): void {
  const { user, newPassword, confirmPassword } = this.resetPasswordModal;
  if (!newPassword || newPassword.length < 6) {
    this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Password must be at least 6 characters.', key: 'tl', life: 3000 });
    return;
  }
  if (newPassword !== confirmPassword) {
    this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Passwords do not match.', key: 'tl', life: 3000 });
    return;
  }
  this.resetPasswordModal.loading = true;
  this.userService.adminResetPassword(user.id, newPassword).subscribe({
    next: () => {
      this.messageService.add({ severity: 'success', summary: 'Done', detail: `Password reset for ${user.username || user.name}.`, key: 'tl', life: 4000 });
      this.closeResetPasswordModal();
    },
    error: () => {
      this.resetPasswordModal.loading = false;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to reset password. Try again.', key: 'tl', life: 4000 });
    }
  });
}

constructor(private confirmationService: ConfirmationService, private messageService: MessageService, private authenticationService: AuthenticationService,     private router: Router,
  private navigationLink: NavigationLinksService, private moduleService: ModulesService, private userService: UserService,  private dataService: DataService){

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

     this.dataService.getBranches().subscribe({
      next: (data: any[]) => {
        this.branches = data
      },
      error(err) {
        console.log(err)
      }
    })


    this.fetchUsers()

    this.userLimit = getLimitsForModule('optimaXPOS').users || 0;
    
}

fetchUsers(){
  this.userService.getUsers().subscribe({
    next: (data) => {
      this.users = data.map((user: { id: number; }) => ({
      ...user,
      appRoles$: this.authenticationService.getUserApplicationRole(user.id).pipe(
        map(((roleObj: any) => roleObj?.appRole.name ?? ''))
      ),
      userBranchName$: this.authenticationService.getUserBranch(user.id).pipe(
        map(((roleObj: any) => roleObj?.branch.name ?? ''))
      ),
      userBranchId$: this.authenticationService.getUserBranch(user.id).pipe(
        map(((roleObj: any) => roleObj?.branch.id ?? ''))
      )
    }));
    this.filteredUsers = [...this.users];
    this.currentPage = 1;
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
  this.isLoading = true;
  const business = sessionStorage.getItem('userPrimaryInfoRegData') ? JSON.parse(sessionStorage.getItem('userPrimaryInfoRegData') || '{}') : null;

  console.log(business)

  const businessInfo = {
    fullname: business?.fullname || '',
    username: this.newUser.name || '',
    profileImage: business?.profileImage || "",
    email: this.newUser.email,
    phoneNumber: business?.phoneNumber,
    address: business?.address,
    country: business?.country,
    state: business?.state,
    city: business?.city,
    postalCode: business?.postalCode,
    industry: business?.industry,
    companyName: business?.companyName,
    clientType: business?.clientType,
    bio: business?.bio,
    currency: business?.currency,
    language: business?.language,
    timeZone: business?.timeZone,
  };


  const signupDetails = {
    username: this.newUser.name,
    password: this.newUser.password,
    email: this.newUser.email,
    project: `${environment.project}`,
    apiKey: `${environment.apiKey}`,
    upi: businessInfo
  };

  console.log(signupDetails)

  this.authenticationService.userRegistration(signupDetails).subscribe({
    next: (data) => {

      const roleRequest = {
          userId: data.id,
          appRoleId: this.selectedRole?.id
        }


      const userBranchRequest = {
        userId: data.id,
        branchId: this.selectedBranch?.id
      }
      
      this.authenticationService.userApplicationRole(roleRequest).subscribe({
        next: () => {
          this.authenticationService.userBranchRole(userBranchRequest).subscribe({
           next: (data) => {
              if (this.codeAuthType) {
              this.authenticationService.codeActivation(data.ecode, true).subscribe({
                next: () => {
                  this.isLoading = false;
                  this.openAddForm = false;
                  this.fetchUsers();
                  this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'User registered and eCode activated successfully!',
                    key: 'tl',
                    life: 3000,
                  });
                },
                error: (err) => {
                  console.error(err);
                  this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to activate user eCode, try again later!',
                      key: 'tl',
                    life: 3000,
                  });
                }
              });
            } else {
              this.isLoading = false;
              this.openAddForm = false;
              this.fetchUsers();
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'User registered and roles assigned successfully!',
                  key: 'tl',
                    life: 3000,
              });
            }
         },
           error: (err) => {

            console.error(err);
            this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to assign branch to user, try again later!',
              key: 'tl',
                    life: 3000,
          });
           }
          })
        
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to assign roles to user, try again later!',
              key: 'tl',
                    life: 3000,
          });
        }
      });
    },
    error: (error) => {
      // Damilola: error now comes as "status:backendMessage" — parse the status code
      this.isLoading = false;
      const errStr = error?.toString() || '';
      const statusCode = errStr.split(':')[0];
      const backendMsg = errStr.split(':').slice(1).join(':').trim();

      if (statusCode === '400') {
        // Damilola: 400 previously showed "not verified" but the real cause is an
        // invalid/missing API key (backend code 1001). Show the actual backend message.
        const detail = backendMsg
          ? `Registration error: ${backendMsg}`
          : 'Invalid request. Please check all required fields and try again.';
        this.messageService.add({ severity: 'error', summary: 'Registration Failed', detail, key: 'tl', life: 5000 });
      } else if (statusCode === '409') {
        this.messageService.add({
          severity: 'error', summary: 'Registration Failed',
          detail: 'This email is already registered. Use a different email or ask the user to log in.',
          key: 'tl', life: 4000,
        });
      } else if (statusCode === '0') {
        this.messageService.add({
          severity: 'error', summary: 'Connection Error',
          detail: 'Unable to reach the server. Check your internet connection and try again.',
          key: 'tl', life: 4000,
        });
      } else {
        this.messageService.add({
          severity: 'error', summary: 'Registration Failed',
          detail: backendMsg || 'An unexpected error occurred. Please try again.',
          key: 'tl', life: 4000,
        });
      }
    }
  });
}


assignRole(user: any, event: any){
  const roleName = this.selectedRole?.name ?? '';

  const doAssign = (existingId: number) => {
    const roleRequest = { id: existingId, userId: user.id, appRoleId: this.selectedRole?.id };
    this.authenticationService.userApplicationRole(roleRequest).subscribe({
      next: () => {
        user.appRoles$ = of(roleName);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Role assigned successfully!', key: 'tl', life: 3000 });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to assign role, try again later!', key: 'tl', life: 3000 });
      }
    });
  };

  this.authenticationService.getUserApplicationRole(user.id).subscribe({
    next: (response) => doAssign(response ? response.id : 0),
    error: ()         => doAssign(0),
  })
  


}

assignBranch(user: any, event: any) {
  const branchName = this.selectedBranch?.name ?? '';
  user.userBranchId$.pipe(
    catchError(() => of(0))
  ).subscribe((branchId: any) => {
    const roleRequest = { id: branchId || 0, userId: user.id, branchId: this.selectedBranch?.id };
    this.authenticationService.userBranchRole(roleRequest).subscribe({
      next: () => {
        user.userBranchName$ = of(branchName);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Branch assigned!' });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to assign branch!' });
      }
    });
  });


  //  this.authenticationService.getUserBranch(user.id).subscribe({
  //   next: (response) => {
  //     console.log("User application role:", response);
  //     // this.selectedRole = response?.appRole || {};
  //          const roleRequest = {
  //     id: response.id || 0,
  //     userId: user.id,
  //     branchId: this.selectedBranch?.id
  //   };

  //     this.authenticationService.userBranchRole(roleRequest).subscribe({
  //         next: () => {
  //           this.messageService.add({
  //             severity: 'success',
  //             summary: 'Success',
  //             detail: 'Branch assigned successfully!',
  //             key: 'tl',
  //             life: 3000,
  //           });
  //           // this.editCompensation(user, event)
  //           this.fetchUsers()
  //         },
  //         error: (err) => {
  //           console.error(err);
  //           this.messageService.add({
  //             severity: 'error',
  //             summary: 'Error',
  //             detail: 'Failed to assign branch, try again later!',
  //             key: 'tl',
  //             life: 3000,
  //           });
  //         }
  //       })
  //   },
  //   error: (error) => {
  //     console.error("Error fetching user branch:", error);
  //     const roleRequest = {
  //       userId: user.id,
  //       branchId: this.selectedBranch?.id
  // }

  // this.authenticationService.userBranchRole(roleRequest).subscribe({
  //     next: () => {
  //       this.messageService.add({
  //         severity: 'success',
  //         summary: 'Success',
  //         detail: 'Branch assigned successfully!',
  //         key: 'tl',
  //         life: 3000,
  //       });
  //       // this.editCompensation(user, event)
  //       this.fetchUsers()
  //     },
  //     error: (err) => {
  //       console.error(err);
  //       this.messageService.add({
  //         severity: 'error',
  //         summary: 'Error',
  //         detail: 'Failed to assign branch, try again later!',
  //         key: 'tl',
  //         life: 3000,
  //       });
  //     }
  //   })
  //   }
  // })
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
                  detail: 'User registered and eCode activated successfully!',
                  key: 'tl',
                  life: 3000,
                });

                user.allowEcodeAuth = status;
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
