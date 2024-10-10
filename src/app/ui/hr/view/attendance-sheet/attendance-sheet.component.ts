import { Component } from '@angular/core';

@Component({
  selector: 'app-attendance-sheet',
  templateUrl: './attendance-sheet.component.html',
  styleUrls: ['./attendance-sheet.component.scss'] // if you have any styles
})
export class AttendanceSheetsComponent {
  title: string = 'Viewing Attendance Information';
  showAttendanceSheets: boolean = true; // Initially show the attendance sheets
  showCheckAttendance: boolean = false; // Initially hide the detailed attendance view
  activeItem: any = {}; // To store the currently active employee item
  viewModal: boolean = false; // Controls visibility of the attendance modal

  // Sample data for attendance sheets
  attendanceSheets: any[] = [
    { employeeID: 'EMP001', employeeName: 'Akinola Ifeoluwa', department: 'IT', date: '2023-11-20', inTime: '07:00', outTime: '14:00', regularizationStatus: 'Pending' },
    { employeeID: 'EMP002', employeeName: 'Damilola Awe', department: 'CEO', date: '2023-11-20', inTime: '07:00', outTime: '14:00', regularizationStatus: 'Pending' },
    { employeeID: 'EMP003', employeeName: 'Babalola Oni', department: 'Accounting', date: '2023-11-20', inTime: '09:00', outTime: '17:00', regularizationStatus: 'Pending' },
    { employeeID: 'EMP004', employeeName: 'Akeredolu Oyinlola', department: 'Sales', date: '2023-11-20', inTime: '07:00', outTime: '14:00', regularizationStatus: 'Pending' }
  ];

  attendanceDetails: any[] = []; // Your array of detailed attendance data

  // Method to toggle the view of attendance sheets and check attendance
  toggleAttendanceView() {
    this.showAttendanceSheets = !this.showAttendanceSheets; // Optionally toggle attendance sheets visibility
    this.viewModal = false; // Close modal if toggling views
  }

  // Method to navigate to check attendance for a specific employee and open the modal
  goToCheckAttendance(employeeID: string) {
    this.activeItem = this.attendanceSheets.find(sheet => sheet.employeeID === employeeID) || {};
    this.viewModal = true; // Open the modal to view attendance
    this.loadAttendanceDetails(); // Load attendance details for the selected employee
  }

  // Load attendance details - this can be replaced with actual data fetching logic
  loadAttendanceDetails() {
    // Load the details based on the selected employeeID (you can replace this with actual logic)
    this.attendanceDetails = [
      { date: '2023-11-20', inTime: '07:00', outTime: '14:00', remarks: 'None' },
      { date: '2023-11-21', inTime: '08:00', outTime: '16:00', remarks: 'None' },

    ];
  }


  closeViewModal() {
    this.viewModal = false; // Close the modal
    this.showAttendanceSheets = true; // Show attendance sheets again when modal closes
    this.showCheckAttendance = false; // Hide check attendance
  }

  // Method to approve regularization
  

  // Method to reject leave
  rejectLeave() {
    // Logic for rejecting leave (you can add your actual logic here)
    console.log("Leave rejected.");
  }
}
