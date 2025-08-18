import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthenticationService } from '../../../sharedComponents/service/auth-service/authentication.service';
import { environment } from '../../../sharedComponents/service/environments/environment.prod';
import { Router } from '@angular/router';
import { NavigationLinksService } from '../../../sharedComponents/service/navigation-links/navigation-links.service';
import { ModulesService } from '../../../service/modules.service';
import { UserService } from '../../../sharedComponents/service/user.service';



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
selectedRole: string[] = [];
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
      this.users = data
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
    // this.submitted = true;

    // this.loading = true;

    const signupDetails = {
        username: this.newUser.name,
        password: this.newUser.password,
        email: this.newUser.email,
        role: this.selectedRole,
        project : `${environment.project}`,
        apiKey : `${environment.apiKey}`
    };

    this.authenticationService.userRegistration(signupDetails).subscribe(
      async (data) => {
            // this.loading = false;
            // this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User registered successfully!' });
            // Optionally, redirect to another page after successful registration
            // this.router.navigateByUrl('/email-verification');
            const emvLink = this.navigationLink.getLink('emvLink')
            if(this.codeAuthType){
              this.authenticationService.codeActivation(data.ecode).subscribe({
                next: () => {
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User registered successfully!' });
                },
                error: (err) => {
                  console.log(err)
                  this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to activate users ecode, Try again later!' });
                },
              })
            }else {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User registered successfully!' });

            }
            // this.router.navigate([emvLink]);
        },
        (error) => {

          if (error.toString() == '400') {
            // Client-side validation error (invalid input)
            this.messageService.add({ 
                severity: 'error', 
                summary: 'Registration Failed', 
                detail: 'Your account have not been verified. Check your mail to verify!' 
            });
        } else if (error.toString() == '409') {
            // Conflict error (e.g., email already registered)
            this.messageService.add({ 
                severity: 'error', 
                summary: 'Registration Failed', 
                detail: 'Email address is already registered. Please use a different email or login.' 
            });
        } else if (error.toString() == '0') {
            // Network error or server unreachable
            this.messageService.add({ 
                severity: 'error', 
                summary: 'Registration Failed', 
                detail: 'Unable to connect to the server. Please check your internet connection.' 
            });
        } else {
            // Other server errors
            this.messageService.add({ 
                severity: 'error', 
                summary: 'Registration Failed', 
                detail: 'An unexpected error occurred. Please try again later.' 
            });
        }


            // this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Registration failed' });
            // console.log("Registration failed");
            // this.loading = false;
        }
    );
  
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

}
