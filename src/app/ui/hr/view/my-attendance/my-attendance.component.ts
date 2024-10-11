import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core'; // Correct import for CalendarOptions
import dayGridPlugin from '@fullcalendar/daygrid'; // Import the dayGrid plugin

@Component({
  selector: 'app-my-attendance',
  templateUrl: './my-attendance.component.html',
  styleUrls: ['./my-attendance.component.scss']
})
export class MyAttendanceComponent implements OnInit, OnChanges {
  @Input() clockedInTime: string | null = null;

  // Existing variables
  userInfoRegData: any[] = [];
  userRegData: any = {};
  displayMessage: string = '';
  isClockedIn: boolean = false;
  note: string = '';
  currentDate: string;
  currentTime: string;
  searchTerm: string = '';
  totalAttendance: number = 0;
  attendanceData: any[] = []; // This will hold attendance data
  attendanceStatus: { [key: string]: string } = {};

  days: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
  viewAttendanceModal: boolean = false;
  currentAttendanceData: any = {};
  employeeInView: any = null;

  // Calendar options (new)
  calendarOptions: CalendarOptions = {}; // Initialize calendar options

  constructor() {
    // Initialize attendance status for each day of the week
    this.days.forEach(day => {
      this.attendanceStatus[day] = 'absent';
    });

    // Set current date and time
    this.currentDate = new Date().toLocaleDateString();
    this.currentTime = new Date().toLocaleTimeString();
  }

  ngOnInit() {
    this.userInfoRegData = JSON.parse(sessionStorage['userPrimaryInfoRegData']);
    this.userRegData = this.userInfoRegData;

    // Mock attendance data - Replace this with actual data
    this.attendanceData = [
      { date: '2024-10-01', status: 'Present' },
      { date: '2024-10-03', status: 'Absent' },
      { date: '2024-10-05', status: 'Leave' },
      { date: '2024-10-07', status: 'Present' }
    ];

    // Calculate total days present
    this.totalAttendance = this.attendanceData.reduce((acc, day) => {
      return acc + (day.status === 'Present' ? 1 : 0);
    }, 0);

    // Map attendance data to calendar events
    const events = this.attendanceData.map(record => {
      return {
        title: record.status,
        start: record.date,
        color: record.status === 'Present' ? 'green' : record.status === 'Absent' ? 'red' : 'orange'
      };
    });

    // Configure calendar options
    this.calendarOptions = {
      initialView: 'dayGridMonth',
      plugins: [dayGridPlugin], // Add the dayGrid plugin
      events: events, // Dynamic events based on attendance
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      }
    };
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['clockedInTime']) {
      this.updateDisplayMessage(changes['clockedInTime'].currentValue);
    }

    // Update current date and time dynamically
    this.currentDate = new Date().toLocaleDateString();
    this.currentTime = new Date().toLocaleTimeString();
  }

  // Function to update the display message based on clock-in time
  updateDisplayMessage(time: string | null) {
    if (time) {
      this.displayMessage = `Clocked in at: ${time}`;
      this.markAttendance(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
    } else {
      this.displayMessage = `Not clocked in yet.`;
    }
  }

  // Function to toggle Clock-In/Out and reset the note
  toggleClockInOut() {
    this.isClockedIn = !this.isClockedIn;
    this.note = '';
  }

  // Filter candidates based on search term
  filterCandidates() {
    if (this.searchTerm.trim()) {
      this.filteredCandidates = this.candidates.filter(candidate =>
        candidate.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredCandidates = [...this.candidates];
    }
  }

  // Mark attendance for a specific day
  markAttendance(day: string) {
    this.attendanceStatus[day] = 'present';

    // Retrieve attendance data for the selected day
    const attendanceData = this.getAttendanceForDay(day);

    // Assign the retrieved data for the modal
    this.currentAttendanceData = attendanceData;

    // Show the modal
    this.viewAttendanceModal = true;
  }

  // Retrieve attendance data for a specific day (mock data)
  getAttendanceForDay(day: string) {
    return {
      type: 'Annual',
      id: '000 45B',
      daysUsed: 10,
      from: '2023-09-01',
      to: '2023-09-10',
      date: '2024-09-30',
      time: '08:00 AM',
      location: 'Office HQ',
      daysPresent: 190,
      daysAbsent: 10,
      overtimeHours: 25
    };
  }

  // Get attendance status (present/absent) for a day
  getStatus(day: string): string {
    return this.attendanceStatus[day] || 'absent';
  }

  // Get CSS class for attendance (present/absent)
  getAttendanceClass(day: string): string {
    return this.attendanceStatus[day] === 'present' ? 'present-class' : 'absent-class';
  }

  // Function to handle closing the popup
  closePopup() {
    this.showPopup = false;
  }
}
