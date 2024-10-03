import { Component, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-attendance-sheet',
  templateUrl: './attendance-sheet.component.html',
  styleUrls: ['./attendance-sheet.component.scss']
})
export class AttendanceSheetsComponent {
  showAttendanceSheets: boolean = true;
  showCheckAttendance: boolean = false; // New flag to control visibility
  activeItem: any = {};
  viewModal: boolean = false;

  attendanceSheets: any[] = [
    { employeeID: 'EMP001', employeeName: 'Akinola Ifeoluwa', department: 'IT', date: '2023-11-20', inTime: '07:00', outTime: '14:00' },
    { employeeID: 'EMP002', employeeName: 'Damilola Awe', department: 'CEO', date: '2023-11-20', inTime: '07:00', outTime: '14:00' },
    { employeeID: 'EMP003', employeeName: 'Babalola Oni', department: 'Accounting', date: '2023-11-20', inTime: '09:00', outTime: '17:00' },
    { employeeID: 'EMP004', employeeName: 'Akeredolu Oyinlola', department: 'Sales', date: '2023-11-20', inTime: '07:00', outTime: '14:00' }
  ];

  attendanceDetails: any[] = [
    // Dummy data for punch in/out details
    { date: '2023-11-20', inTime: '07:00', outTime: '14:00', remarks: 'None' },
    { date: '2023-11-20', inTime: '08:00', outTime: '16:00', remarks: 'None' },
    // Add more entries as needed
  ];

  goToCheckAttendance(employeeID: any) {
    this.activeItem = employeeID;
    this.showAttendanceSheets = false; // Hide attendance sheets
    this.showCheckAttendance = true; // Show check attendance
  }



  closeViewModal() {
    this.viewModal = false;
    this.showAttendanceSheets = true; // Show attendance sheets again when modal closes
    this.showCheckAttendance = false; // Hide check attendance
  }
}


  // constructor(private changeDetectorRef: ChangeDetectorRef) {}

  // // Function to filter attendance sheets
  // filterAttendanceSheets() {
  //   this.filteredAttendanceSheets = this.attendanceSheets.filter(attendanceSheets => {
  //     const matchesSearchTerm = attendanceSheets.employeeName.toLowerCase().includes(this.searchTerm.toLowerCase());
  //     // Add more filtering criteria as needed (e.g., date range, department)

  //     return matchesSearchTerm;
  //   });
  // }

  // // Function to open the view modal
  // openViewModal(attendanceSheets: any, op: any) {
  //   this.activeItem = attendanceSheets;
  //   this.viewModal = true;
  //   op.hide();
  // }

  // // Function to close the view modal
  // closeViewModal() {
  //   this.viewModal = false;
  // }

  // // Function to add a new attendance sheet entry
  // addNewAttendanceSheets() {
  //   // Implement logic to add a new entry
  //   // ...
  // }

  // // Function to edit an existing attendance sheet entry
  // editAttendanceSheets(attendanceSheets: any) {
  //   // Update the attendanceSheet object with the new values
  //   attendanceSheets.employeeName = 'Updated Name';
  //   attendanceSheets.department = 'Updated Department';

  //   // Update the filteredAttendanceSheets array
  //   this.filteredAttendanceSheets = [...this.filteredAttendanceSheets];

  //   // Trigger UI updates if necessary
  //   this.changeDetectorRef.detectChanges();
  // }

  // // Function to delete an attendance sheet entry
  // deleteAttendanceSheets(attendanceSheets: any) {
  //   const index = this.attendanceSheets.indexOf(attendanceSheets);
  //   if (index !== -1) {
  //     this.attendanceSheets.splice(index, 1);
  //     this.filteredAttendanceSheets = [...this.filteredAttendanceSheets];

  //     // Trigger UI updates if necessary
  //     this.changeDetectorRef.detectChanges();
  //   }
  // }

  // Other methods as needed
