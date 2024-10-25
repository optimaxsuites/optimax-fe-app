import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid'; // Import the dayGrid plugin
import { HttpClient } from '@angular/common/http'; // For API integration
import { NotificationComponent } from './notification/notification.component';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';

@Component({
  selector: 'app-my-attendance',
  templateUrl: './my-attendance.component.html',
  styleUrls: ['./my-attendance.component.scss'],
})
export class MyAttendanceComponent implements OnInit, OnChanges {
  @Input() clockedInTime: string | null = null;
  @ViewChild(NotificationComponent) notification!: NotificationComponent;

  // Notification properties
  notificationMessage: string = '';
  notificationType: string = 'info';

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
  attendanceData: any[] = []; // This will hold real attendance data
  attendanceStatus: { [key: string]: string } = {};
  days: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Updated properties for TO DO List
  isTodoVisible: boolean = false;
  todoTasks: { name: string; priority: string; dueDate: string; status: string; assignedBy: string }[] = [
    { name: 'Submit attendance report', priority: 'High', dueDate: '17th Oct 2024', status: 'Pending', assignedBy: 'John Doe' },
    { name: 'Check for late clock-ins', priority: 'Medium', dueDate: '18th Oct 2024', status: 'In Progress', assignedBy: 'Jane Smith' },
    { name: 'Prepare monthly summary', priority: 'Low', dueDate: '20th Oct 2024', status: 'Completed', assignedBy: 'Yourself' },
    { name: 'Finish report', priority: 'High', dueDate: '2024-10-25', status: 'Pending', assignedBy: 'Alice' },
    { name: 'Prepare presentation', priority: 'Medium', dueDate: '2024-10-28', status: 'In Progress', assignedBy: 'Bob' },
    { name: 'Email project update', priority: 'Low', dueDate: '2024-10-23', status: 'Completed', assignedBy: 'Charlie' },
    { name: 'Submit attendance report', priority: 'High', dueDate: '17th Oct 2024', status: 'Pending', assignedBy: 'John Doe' },
    { name: 'Check for late clock-ins', priority: 'Medium', dueDate: '18th Oct 2024', status: 'In Progress', assignedBy: 'Jane Smith' },
    { name: 'Prepare monthly summary', priority: 'Low', dueDate: '20th Oct 2024', status: 'Completed', assignedBy: 'Yourself' },
    { name: 'Finish report', priority: 'High', dueDate: '2024-10-25', status: 'Pending', assignedBy: 'Alice' },
    { name: 'Prepare presentation', priority: 'Medium', dueDate: '2024-10-28', status: 'In Progress', assignedBy: 'Bob' },
    { name: 'Email project update', priority: 'Low', dueDate: '2024-10-23', status: 'Completed', assignedBy: 'Charlie' }
  ];

  reviewData = [
    { title: 'Quarterly Review', employee: 'John Doe', date: '2024-10-20', comments: 'Great performance!' },
    { title: 'Annual Review', employee: 'Jane Smith', date: '2024-11-15', comments: 'Needs improvement in communication.' },
    { title: 'Mid-Year Review', employee: 'Jim Brown', date: '2024-07-30', comments: 'Excellent team player.' },
    { title: 'Quarterly Review', employee: 'John Doe', date: '2024-10-20', comments: 'Great performance!' },
    { title: 'Annual Review', employee: 'Jane Smith', date: '2024-11-15', comments: 'Needs improvement in communication.' },
    { title: 'Mid-Year Review', employee: 'Jim Brown', date: '2024-07-30', comments: 'Excellent team player.' },
    { title: 'Quarterly Review', employee: 'John Doe', date: '2024-10-20', comments: 'Great performance!' },
    { title: 'Annual Review', employee: 'Jane Smith', date: '2024-11-15', comments: 'Needs improvement in communication.' },
    { title: 'Mid-Year Review', employee: 'Jim Brown', date: '2024-07-30', comments: 'Excellent team player.' },
    { title: 'Quarterly Review', employee: 'John Doe', date: '2024-10-20', comments: 'Great performance!' },
    { title: 'Annual Review', employee: 'Jane Smith', date: '2024-11-15', comments: 'Needs improvement in communication.' },
    { title: 'Mid-Year Review', employee: 'Jim Brown', date: '2024-07-30', comments: 'Excellent team player.' }
  ];

  events = [
    { name: 'Team Meeting', date: '2024-10-22', location: 'Conference Room', notes: 'Discuss project updates' },
    { name: 'Workshop', date: '2024-11-05', location: 'Online', notes: 'Skills development workshop' },
    { name: 'Client Presentation', date: '2024-10-30', location: 'Client Office', notes: 'Present final project' },
    { name: 'Team Meeting', date: '2024-10-22', location: 'Conference Room', notes: 'Discuss project updates' },
    { name: 'Workshop', date: '2024-11-05', location: 'Online', notes: 'Skills development workshop' },
    { name: 'Client Presentation', date: '2024-10-30', location: 'Client Office', notes: 'Present final project' },
    { name: 'Team Meeting', date: '2024-10-22', location: 'Conference Room', notes: 'Discuss project updates' },
    { name: 'Workshop', date: '2024-11-05', location: 'Online', notes: 'Skills development workshop' },
    { name: 'Client Presentation', date: '2024-10-30', location: 'Client Office', notes: 'Present final project' },
    { name: 'Team Meeting', date: '2024-10-22', location: 'Conference Room', notes: 'Discuss project updates' },
    { name: 'Workshop', date: '2024-11-05', location: 'Online', notes: 'Skills development workshop' },
    { name: 'Client Presentation', date: '2024-10-30', location: 'Client Office', notes: 'Present final project' },
  ];

  // Modal and popup logic
  showPopup: boolean = false;
  selectedDay: string = '';
  selectedDate: string = '';
  actionsVisible: boolean = false;
  filteredAttendanceRecords: any[] = [];
  viewAttendanceModal: boolean = false;
  currentAttendanceData: any = {};
  employeeInView: any = null;

  // Modal visibility properties
  showAddEventModal: boolean = false;
  showReviewModal: boolean = false;
  showToDoModal: boolean = false;

  // Additional properties for modal management
  isModalOpen: boolean = false; // To control modal visibility
  modalType: string = ''; // To store the type of the modal (todo, review, addEvent)
  modalTitle: string = ''; // To store the title of the modal

  // Calendar options
  calendarOptions: CalendarOptions = {}; // Initialize this property

  constructor(private http: HttpClient) {
    this.days.forEach(day => {
      this.attendanceStatus[day] = 'absent';
    });

    this.currentDate = new Date().toLocaleDateString();
    this.currentTime = new Date().toLocaleTimeString();
  }

  ngOnInit() {
    this.userInfoRegData = JSON.parse(sessionStorage['userPrimaryInfoRegData']);
    this.userRegData = this.userInfoRegData;

    this.loadAttendanceData();
    this.totalAttendance = this.attendanceData.reduce((acc, day) => {
      return acc + (day.status === 'Present' ? 1 : 0);
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['clockedInTime']) { // Use bracket notation
      this.updateDisplayMessage(changes['clockedInTime'].currentValue);
    }

    this.currentDate = new Date().toLocaleDateString();
    this.currentTime = new Date().toLocaleTimeString();
  }

  loadAttendanceData() {
    if (sessionStorage.getItem('attendanceData')) {
      this.attendanceData = JSON.parse(sessionStorage.getItem('attendanceData') || '[]');
      this.updateCalendarEvents();
    } else {
      this.http.get<any[]>('https://your-api-url/attendance')
        .subscribe(data => {
          this.attendanceData = data;
          this.updateCalendarEvents();
        }, error => {
          console.error('Failed to load attendance data', error);
        });
    }
  }

  updateCalendarEvents() {
    const events = this.attendanceData.map(record => {
      return {
        title: record.status,
        start: record.date,
        color: record.status === 'Present' ? 'green' : record.status === 'Absent' ? 'red' : 'orange'
      };
    });

    this.calendarOptions = {
      initialView: 'dayGridMonth',
      plugins: [dayGridPlugin, interactionPlugin],
      dateClick: (arg) => this.handleDateClick(arg),
      events: events,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
    };
  }

  updateDisplayMessage(time: string | null) {
    this.displayMessage = time ? `Clocked in at: ${time}` : `Not clocked in yet.`;
  }

  toggleClockInOut() {
    const currentDay = new Date().toISOString().split('T')[0];
    const alreadyClockedIn = this.attendanceData.some(record => record.date === currentDay && record.status === 'Present');

    if (alreadyClockedIn) {
      this.notificationMessage = 'You have already clocked in today!';
      this.notificationType = 'error';
      this.notification.display(this.notificationMessage);
      return;
    }

    this.isClockedIn = !this.isClockedIn;
    const newRecord = {
      date: currentDay,
      status: this.isClockedIn ? 'Present' : 'Absent'
    };

    this.attendanceData.push(newRecord);
    sessionStorage.setItem('attendanceData', JSON.stringify(this.attendanceData));
    this.updateCalendarEvents();

    this.notificationMessage = this.isClockedIn ? 'Successfully clocked in!' : 'Successfully clocked out!';
    this.notificationType = 'success';
    this.notification.display(this.notificationMessage);
  }

  handleDateClick(arg: DateClickArg) {
    console.log("Date clicked:", arg.date);
    this.showActionItems(arg.date);
  }

  showActionItems(currentDay: Date) {
    this.selectedDate = currentDay.toISOString().split('T')[0];
    console.log("Selected date:", this.selectedDate);
    this.actionsVisible = true; // Show action options when a valid date is clicked
  }

  performAction(action: string) {
    if (this.selectedDate) {
      console.log("Performing action:", action);
      switch (action) {
        case 'To Do':
          this.openModal('todo'); // Update to call openModal
          break;
        case 'Review':
          this.openModal('review'); // Update to call openModal
          break;
        case 'Add Event':
          this.openModal('addEvent'); // Update to call openModal
          break;
        default:
          this.notificationMessage = 'Unknown action';
          this.notificationType = 'error';
          this.notification.display(this.notificationMessage);
      }
    } else {
      this.notificationMessage = 'Please select a day first.';
      this.notificationType = 'error';
      this.notification.display(this.notificationMessage);
    }
  }

  // Method to open a modal
  openModal(modalType: string) {
    this.isModalOpen = true;
    this.modalType = modalType;

    // Set the modal title based on the type
    switch (modalType) {
      case 'todo':
        this.modalTitle = 'To Do';
        break;
      case 'review':
        this.modalTitle = 'Review';
        break;
      case 'addEvent':
        this.modalTitle = 'Add Event';
        break;
    }
  }

  // Method to close a modal
  closeModal(modalType: string = '') {
    this.isModalOpen = false;
    this.modalType = '';
    this.modalTitle = '';

    switch (modalType) {
      case 'AddEvent':
        this.showAddEventModal = false;
        break;
      case 'Review':
        this.showReviewModal = false;
        break;
      case 'ToDo':
        this.closeTodoPopup();
        break;
      default:
        this.isModalOpen = false;
        this.modalType = '';
        this.modalTitle = '';
    }
  }

  // Method to close the TO DO popup
  closeTodoPopup() {
    this.showToDoModal = false;
    this.isTodoVisible = false;
  }

  closePopup() {
    this.showPopup = false;
  }
}
