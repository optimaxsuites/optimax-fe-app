import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-my-attendance',
  templateUrl: './my-attendance.component.html',
  styleUrls: ['./my-attendance.component.scss']
})
export class MyAttendanceComponent implements OnChanges {
  @Input() clockedInTime: string | null = null;
  userInfoRegData: any[] = [];
  userRegData: any = {};
  displayMessage: string = '';
  isClockedIn: boolean = false;
  note: string = '';
  currentDate: string;
  currentTime: string;
  searchTerm: string = '';
  totalAttendance: number = 0;
  attendanceData: any[] = [];

  days: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  attendanceStatus: { [key: string]: string } = {};

  // Mock data for attendance records
  candidates = [
    { name: 'John Doe', days: 7, regularTime: 8, overtime: 21, attendanceDay: 'Monday' },
    { name: 'Jane Smith', days: 5, regularTime: 7, overtime: 15, attendanceDay: 'Monday' },
    { name: 'Bob Johnson', days: 6, regularTime: 8, overtime: 20, attendanceDay: 'Tuesday' }
  ];

  filteredCandidates = [...this.candidates];

  // New variables for pop-up and modal logic
  showPopup: boolean = false;
  selectedDay: string = '';
  filteredAttendanceRecords: any[] = [];
  viewAttendanceModal: boolean = false;  // Control the visibility of the modal
  currentAttendanceData: any = {
   

  };  // Holds the current attendance data to display in the modal
  employeeInView: any = null;



  openTotalDaysPresentPage() {
    console.log('Open total days present page functionality not yet implemented');
  }

  constructor() {
    this.days.forEach(day => {
      this.attendanceStatus[day] = 'absent';
    });

    this.currentDate = new Date().toLocaleDateString();
    this.currentTime = new Date().toLocaleTimeString();
  }

  ngOnInit() {
    this.userInfoRegData = JSON.parse(sessionStorage['userPrimaryInfoRegData']);
    this.userRegData = this.userInfoRegData;


    this.totalAttendance = this.attendanceData.reduce((acc, day) => {
      return acc + (day.status === 'Present' ? 1 : 0);
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['clockedInTime']) {
      this.updateDisplayMessage(changes['clockedInTime'].currentValue);
    }

    this.currentDate = new Date().toLocaleDateString();
    this.currentTime = new Date().toLocaleTimeString();
  }







  updateDisplayMessage(time: string | null) {
    if (time) {
      this.displayMessage = `Clocked in at: ${time}`;
      this.markAttendance(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
    } else {
      this.displayMessage = `Not clocked in yet.`;
    }
  }

  viewOvertimeDetails() {
    // Check if overtimeDetails property exists in currentAttendanceData
    if (this.currentAttendanceData && this.currentAttendanceData.overtimeDetails) {
      console.log('Overtime details:', this.currentAttendanceData.overtimeDetails);
      // Implement your modal display logic here
      this.viewAttendanceModal = true; // Set modal visibility to true (use viewAttendanceModal)
    } else {
      console.log('No overtime details available');
      // Handle the case where no overtime details are present
    }
  }

  viewAbsentDetails() {
    // Implement your logic to display details about absent days
    console.log('Displaying details about absent days');
    // You can use a modal or any other suitable method to display details
  }



  markAttendance(day: string) {
    this.attendanceStatus[day] = 'present';

    // Retrieve attendance data for the selected day (e.g., all Mondays)
    const attendanceData = this.getAttendanceForDay(day);

    // Assign the retrieved data to a variable for display in the modal
    this.currentAttendanceData = attendanceData;

    // Show the modal
    this.viewAttendanceModal = true;
  }

  getAttendanceForDay(day: string) {
    return {
      type: 'Annual',
      id:'000 45B',
      daysUsed: 10,
      from: '2023-09-01',
      to: '2023-09-10',
      date: '2024-09-30',
      time: '08:00 AM',
      location: 'Office HQ',
      daysPresent: 190,
      daysAbsent: 10,
      overtimeHours: 25,
    };
  }

  getStatus(day: string): string {
    return this.attendanceStatus[day] || 'absent';
  }

  getAttendanceClass(day: string): string {
    return this.attendanceStatus[day] === 'present' ? 'present-class' : 'absent-class';
  }

  toggleClockInOut() {
    this.isClockedIn = !this.isClockedIn;
    this.note = '';
  }

  filterCandidates() {
    if (this.searchTerm.trim()) {
      this.filteredCandidates = this.candidates.filter(candidate =>
        candidate.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredCandidates = [...this.candidates];
    }
  }

  closePopup() {
    this.showPopup = false;
  }
}
