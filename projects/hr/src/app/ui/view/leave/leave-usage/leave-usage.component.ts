import { Component, OnInit } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';

@Component({
  selector: 'app-leave-usage',
  templateUrl: './leave-usage.component.html',
  styleUrl: './leave-usage.component.scss'
})
export class LeaveUsageComponent implements OnInit {

  statuses: string[] = ['Pending Approval', 'Approved', 'Rejected']

  leaveTypes: string[] = [  "Annual Leave",
    "Sick Leave",
    "Maternity Leave",
    "Paternity Leave",
    "Vacation Leave",
    "Bereavement Leave",
    "Study Leave",
    "Unpaid Leave",
    "Emergency Leave",
    "Compassionate Leave",
    "Sabbatical Leave",
    "Public Holiday Leave",
    "Medical Leave",
    "Parental Leave",
    "Compensatory Leave (Comp Time)",
    "Marriage Leave",
    "Religious Leave",
    "Volunteer Leave"];
  userInfoRegData: any[] = [];
  userRegData: any = { };
selectedLeaveType: any;
selectedStatus: any;
searchTerm: any;
allRequests = []
myRequests:any = []
filteredRequests: any = []
requestInView: any;
openViewRequest: boolean = false


  ngOnInit() {
    // this.userInfoRegData = JSON.parse(sessionStorage["userPrimaryInfoRegData"]);
    this.userRegData = this.userInfoRegData;

    this.allRequests = JSON.parse(localStorage.getItem("leaveRequest") || '[]');
    console.log(this.allRequests)
    this.filteredRequests = this.allRequests.filter((request: any) => request.Employee === this.userRegData.fullname);
    this.myRequests = [...this.filteredRequests]
  this.sortByStatus()

    }
    sortByStatus() {
      this.myRequests.sort((a: any, b:any) => {
        const dateA = new Date(a.AppliedOn);
        const dateB = new Date(b.AppliedOn);
    return dateB.getTime() - dateA.getTime();
      });
    }

    filterCandidates() {
      this.myRequests = this.filteredRequests.filter((employee: { Employee: string; }) => 
        employee.Employee.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
      this.myRequests = this.filteredRequests.filter((employee: { Employee: string; LeaveType: any; Status: any; }) => {
        // Check if the candidate matches the search term
        const matchesSearchTerm = employee.Employee.toLowerCase().includes(this.searchTerm.toLowerCase());
    
        // Check if the candidate matches one of the selected leaveType or status (if any)
        const matchesLeaveType = this.selectedLeaveType.length === 0 || this.selectedLeaveType.includes(employee.LeaveType);
        const matchesStatus = this.selectedStatus.length === 0 || this.selectedStatus.includes(employee.Status);
  
    
        // Return true if all conditions are met
        return matchesSearchTerm && matchesLeaveType && matchesStatus;
      });
      this.sortByStatus();
  }
    filterBySelectedStatus() {
      console.log(this.selectedStatus)
      if (this.selectedStatus.length == 0 ) {
     
          this.myRequests = [...this.filteredRequests]; 
        } else {
          this.myRequests = this.filteredRequests.filter((employee: { Status: string; }) => 
              this.selectedStatus.some((status: string) => 
                employee.Status.toLowerCase().includes(status.toLowerCase()) 
              )
            );
        }
  
        if (this.searchTerm && this.searchTerm.trim() !== '') {
          this.filterCandidates();
        }
        this.sortByStatus();
      }
      
      filterBySelectedLeaveType() {
          if (this.selectedLeaveType.length == 0 ) {
              this.myRequests = [...this.filteredRequests]; 
            } else {
              this.myRequests = this.filteredRequests.filter((employee: { LeaveType: string; }) => 
                  this.selectedLeaveType.some((status: string) => 
                    employee.LeaveType.toLowerCase().includes(status.toLowerCase()) 
                  )
                );
            }
      
            if (this.searchTerm && this.searchTerm.trim() !== '') {
              this.filterCandidates();
            }
            this.sortByStatus();
      }

      viewLRequest(request: any, op: OverlayPanel) {
        this.requestInView = request
        this.openViewRequest = true
        op.hide();
      }
}
