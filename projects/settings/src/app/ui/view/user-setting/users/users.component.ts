import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthenticationService } from '../../../sharedComponents/service/auth-service/authentication.service';
import { environment } from '../../../sharedComponents/service/environments/environment.prod';
import { Router } from '@angular/router';
import { NavigationLinksService } from '../../../sharedComponents/service/navigation-links/navigation-links.service';



interface user {
  name: string;
  email: string;
  status: string;
  dateCreated: string;
  password?: string;
  permission: {
    [key: string]: string;
  };
  isEditing?:boolean
}
@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {

openAddForm: boolean = false
uniqueLevels = ['admin', 'checkout', 'inventory manager']
uniquePositions = ['POS', 'Human resources', 'Office productivity']
selectedPosition: any;
selectedEmployeeType: any;
searchTerm: any;
filteredUsers: any[] = [];
Object = Object

users: user[] = [
  {
    name: "John Doe",
    email: "john.doe@example.com",
    dateCreated: "2024-03-01",
    status: "active",
    permission: { pos: "admin", "human resources": "manager" },
    isEditing: false,

  },
  {
    name: "Jane Smith",
    email: "jane.smith@example.com",
    dateCreated: "2024-02-15",
    status: "inactive",
    permission: { pos: "cashier", "human resources": "staff" },
    isEditing: false,

  },
  {
    name: "Michael Johnson",
    email: "michael.johnson@example.com",
    dateCreated: "2023-12-10",
    status: "active",
    permission: { pos: "supervisor", "human resources": "manager" },
    isEditing: false,

  },
  {
    name: "Emily Brown",
    email: "emily.brown@example.com",
    dateCreated: "2024-01-25",
    status: "inactive",
    permission: { pos: "staff", "human resources": "assistant" },
    isEditing: false,

  },
  {
    name: "David Wilson",
    email: "david.wilson@example.com",
    dateCreated: "2023-11-30",
    status: "active",
    permission: { pos: "admin", "human resources": "director" },
    isEditing: false,

  }
];

newUser: user ={
  name: '',
  email: '',
  status: 'Active',
  dateCreated: '',
  password: '',
  permission: {
    
  },
}
selectedModule: string = ''; 
selectedRole: string = '';


constructor(private confirmationService: ConfirmationService, private messageService: MessageService, private authenticationService: AuthenticationService,     private router: Router,
  private navigationLink: NavigationLinksService,){

}

applyFilters() {
  // this.filteredUsers = this.users.filter((user: { name: any; position: string; firstName: string; lastName: string; }) => {
  //   const matchesLevelType = this.selectedEmployeeType.length === 0 || 
  //                            this.selectedEmployeeType.includes(user.level);

  //   const matchesPosition = this.selectedPosition.length === 0 || 
  //                           this.selectedPosition.includes(user.position);

  //   const matchesSearchTerm = this.searchTerm === '' || 
  //                             user.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
  //                             user.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
  //                             user.position.toLowerCase().includes(this.searchTerm.toLowerCase());

  //   return matchesLevelType && matchesPosition && matchesSearchTerm;
  // });
}

filterBySelectedEmployeeType() {
  // this.filteredUsers = this.users.filter((user: { level: any; position: string; firstName: string; lastName: string; }) => {
  //   return this.selectedEmployeeType.length === 0 || 
  //                            this.selectedEmployeeType.includes(user.level);
  // })
  }


filterBySelectedPosition() {
  //  this.filteredUsers = this.users.filter((user: { level: any; position: string; firstName: string; lastName: string; }) => {
  //   return this.selectedPosition.length === 0 || 
  //   this.selectedPosition.includes(user.position);
  // })
   }
   updateRole(permission: any){
    if (this.selectedModule && this.selectedRole) {
      permission[this.selectedModule] = this.selectedRole;
    this.selectedModule = ''
    this.selectedRole = ''
    }
   }

   revokeRole(user: any, moduleKey: string) {
  
      delete user.permission[moduleKey];

   
  }

  submitUser() {
    // this.submitted = true;

    // this.loading = true;

    const signupDetails = {
        username: this.newUser.name,
        password: this.newUser.password,
        email: this.newUser.email,
        role: ['user'],
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
            this.router.navigate([emvLink]);
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

    updateUser(user: user) {
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
  confirmDeleteUser(user: user, event: Event) {
    event.stopPropagation()

    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of ${user.name}'s salary structure`,
      header: `Delete user - ${user.name}`,
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

  deleteUser(user: user){
    this.users = this.users.filter((u: user) => u.name!== user.name);
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
        this.newUser.permission[this.selectedModule] = this.selectedRole;
    
        this.selectedModule = '';
        this.selectedRole = '';
    
        console.log("Updated User Permissions:", this.newUser.permission);
      } else {
        alert("Please select both a module and a role.");
      }
    }
}
