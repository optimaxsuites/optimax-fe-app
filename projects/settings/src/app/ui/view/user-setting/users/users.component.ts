import { Component } from '@angular/core';



interface user {
  name: string;
  email: string;
  status: string;
  dateCreated: string;
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
submitUser() {
throw new Error('Method not implemented.');
}
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
  permission: {
    
  },
}
selectedModule: string = ''; 
selectedRole: string = '';

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


  confirmCompensationDelete(arg0: any,$event: MouseEvent) {
    throw new Error('Method not implemented.');
    }
    editCompensation(role: any,$event: MouseEvent) {
      $event.stopPropagation()
      role.isEditing = !role.isEditing 


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
