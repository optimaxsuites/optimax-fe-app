import { Component, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-attendance-sheet',
  templateUrl: './attendance-sheet.component.html',
  styleUrls: ['./attendance-sheet.component.scss']

})
export class AttendanceSheetsComponent {
  showAttendanceSheets: boolean = true;
  searchTerm: string = '';
  activeItem: any = {};
  viewModal: boolean = false;


  getStatusClass(Remarks: string) {
    switch (Remarks) {
      case 'late':
        return 'badge badge-lightgrey';
      case 'early':
        return 'badge badge-lightblue';
        case 'absent':
          return 'badge badge-lightblue';
      default:
        return '';
    }
  }







  Remarks = ['late', 'early' , 'absent'];

  attendanceSheets: any[] = [
    { employeeID: 'EMP001', employeeName: 'Akinola Ifeoluwa', department: 'IT', date: '2023-11-20',  punchInTimeNote: '09:00', punchoutTimeNote: '17:00' , punchoutTime: '17:00' , punchInTime:'12:00' , Remark: 'late' },
    { employeeID: 'EMP002', employeeName: 'Damilola Awe', department: 'CEO', date: '2023-11-20', inTime: '07:00', outTime: '14:00', },
    { employeeID: 'EMP003', employeeName: 'Babalola Oni', department: 'Accounting', date: '2023-11-20', inTime: '09:00', outTime: '17:00' , Remark: 'absent' },
    { employeeID: 'EMP004', employeeName: 'Akeredolu Oyinlola ', department: 'Sales', date: '2023-11-20', inTime: '07:00', outTime: '14:00', Remark: 'early'},

  ];

  filteredAttendanceSheets: any[] = [...this.attendanceSheets];

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
}
