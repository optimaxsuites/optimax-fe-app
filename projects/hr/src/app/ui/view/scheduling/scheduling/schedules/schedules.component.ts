import { Component, OnInit } from '@angular/core';
import { Shift, ShiftRecord, ShiftService } from '../../../../service/schedules.service';

interface EmployeeAttendance {
  employeeId: number;
  employeeName: string;
  record?: ShiftRecord; // Optional - exists only if they've clocked in/out
  status: 'Scheduled' | 'Completed' | 'Late' | 'Missed' | 'Unscheduled';
}

interface ShiftWithAttendance extends Shift {
  attendance: EmployeeAttendance[];
}

interface Employee {
  id: number;
  name: string;
}

// Add interface for projects
interface Project {
  id: number;
  name: string;
}

@Component({
  selector: 'app-schedules',
  templateUrl: './schedules.component.html',
  styleUrl: './schedules.component.scss'
})
export class SchedulesComponent implements OnInit {
  viewMode: 'calendar' | 'table' = 'calendar';
  shifts: Shift[] = [];
  records: ShiftRecord[] = [];
  selectedDate: Date = new Date();
  selectedDateString = '';
  openForm: boolean = false;
  
  selectedDateShifts: ShiftWithAttendance[] = [];
  selectedRecord: ShiftRecord | null = null;
  selectedEmployee: EmployeeAttendance | null = null;

    newShift: Partial<Shift> = {};
  
  // Dropdown options
  availableEmployees: Employee[] = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Mary Smith' },
    { id: 3, name: 'Tunde Ola' },
    { id: 4, name: 'Jane Johnson' },
    { id: 5, name: 'Samuel Lee' },
    { id: 6, name: 'Ahmed Hassan' },
    { id: 7, name: 'Fatima Bello' }
  ];

  availableProjects: Project[] = [
    { id: 1, name: 'CivicLens Dashboard' },
    { id: 2, name: 'iTeleStream Upgrade' },
    { id: 3, name: 'ERP Revamp' },
    { id: 4, name: 'Mobile App Development' },
    { id: 5, name: 'System Maintenance' }
  ];

  recurrenceOptions = [
    { label: 'None', value: undefined },
    { label: 'Daily', value: 'Daily' },
    { label: 'Weekly', value: 'Weekly' },
    { label: 'Custom', value: 'Custom' }
  ];

  scheduleColumns = [
    { header: 'Shift Name', field: 'shiftName' },
    { header: 'Project', field: 'projectName' },
    { header: 'Employee', field: 'employeeName' },
    { header: 'Time', field: 'time' },
    { header: 'Actual In/Out', field: 'actualTime' },
    {
      header: 'Status',
      field: 'status',
      badgeClass: (row: any) => this.getStatusClass(row.status)
    },
    { header: 'Details', field: 'details' }
  ];

  get scheduleRows() {
    return this.selectedDateShifts.flatMap((shift) =>
      shift.attendance.map((employee) => ({
        shiftName: shift.name,
        projectName: shift.projectName || '—',
        employeeName: employee.employeeName,
        time: `${shift.startTime} - ${shift.endTime}`,
        actualTime: this.formatActualTime(employee.record),
        status: employee.status,
        details: 'View',
        employee
      }))
    );
  }
  
  constructor(private shiftService: ShiftService) {}

  ngOnInit() {
    this.shifts = this.shiftService.getAllShifts();
    this.records = this.shiftService.getShiftRecords();
    this.onDateSelect(new Date());
  }

  hasShiftsOnDate(date: any): boolean {
    const dateStr = `${date.year}-${String(date.month + 1).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
    return this.shifts.some(shift => this.isShiftActiveOnDate(shift, dateStr));
  }

  isShiftActiveOnDate(shift: Shift, dateStr: string): boolean {
    const shiftDate = new Date(shift.date);
    const checkDate = new Date(dateStr);
    
    if (shift.date === dateStr) return true;
    
    if (shift.recurrence === 'Daily' && checkDate >= shiftDate) {
      return true;
    }
    
    if (shift.recurrence === 'Weekly') {
      const daysDiff = Math.floor((checkDate.getTime() - shiftDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff % 7 === 0;
    }
    
    return false;
  }

  onDateSelect(selected: Date) {
    this.selectedDate = selected;
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    this.selectedDateString = `${yyyy}-${mm}-${dd}`;
    
    // Build shifts with ALL assigned employees (with or without records)
    this.selectedDateShifts = this.shifts
      .filter(shift => this.isShiftActiveOnDate(shift, this.selectedDateString))
      .map(shift => ({
        ...shift,
        attendance: this.buildAttendanceList(shift)
      }));
    
    this.selectedRecord = null;
    this.selectedEmployee = null;
  }

  // Build attendance list: all assigned employees + their records if they exist
  buildAttendanceList(shift: Shift): EmployeeAttendance[] {
    return shift.assignedTo.map(employee => {
      // Find if this employee has a record for the selected date
      const record = this.records.find(
        r => r.shiftId === shift.id && 
             r.employeeId === employee.id && 
             r.date === this.selectedDateString
      );

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        record: record,
        status: record ? record.status : 'Scheduled'
      };
    });
  }

  toggleView(view: 'calendar' | 'table') {
    this.viewMode = view;
    this.selectedRecord = null;
    this.selectedEmployee = null;
  }

  getProjectName(shiftId: number): string {
    const shift = this.shifts.find(s => s.id === shiftId);
    return shift ? shift.projectName || '—' : '—';
  }

  getShiftName(shiftId: number): string {
    const shift = this.shifts.find(s => s.id === shiftId);
    return shift ? shift.name || '—' : '—';
  }

  selectEmployee(employee: EmployeeAttendance) {
    this.selectedEmployee = employee;
    this.selectedRecord = employee.record || null;
  }

  clearSelection() {
    this.selectedRecord = null;
    this.selectedEmployee = null;
  }

  addSchedule() {
this.openForm = true
    this.resetForm();

  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'Completed': return 'text-green-600 bg-green-100';
      case 'Scheduled': return 'text-yellow-600 bg-yellow-100';
      case 'Late': return 'text-orange-600 bg-orange-100';
      case 'Missed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  private formatActualTime(record?: ShiftRecord): string {
    if (!record?.actualClockIn) return '—';
    const clockOut = record.actualClockOut ? ` - ${record.actualClockOut}` : '';
    const working = !record.actualClockOut ? ' (Working)' : '';
    return `${record.actualClockIn}${clockOut}${working}`;
  }



  resetForm() {
    this.newShift = {
      name: '',
      projectId: undefined,
      projectName: '',
      assignedTo: [],
      startTime: '',
      endTime: '',
      recurrence: undefined,
      location: '',
      active: true,
      date: this.selectedDateString
    };
  }

  onProjectChange(event: any) {
    const project = this.availableProjects.find(p => p.id === event.value);
    if (project) {
      this.newShift.projectName = project.name;
    }
  }

  saveSchedule() {
    // Validate required fields
    if (!this.newShift.name || !this.newShift.startTime || !this.newShift.endTime || 
        !this.newShift.assignedTo || this.newShift.assignedTo.length === 0 || !this.newShift.date) {
      alert('Please fill in all required fields');
      return;
    }

    // Convert employee IDs to employee objects
    const assignedEmployees = this.newShift.assignedTo.map((empId: any) => {
      const emp = this.availableEmployees.find(e => e.id === empId);
      return { id: empId, name: emp?.name || '' };
    });

    const shiftToAdd: Shift = {
      id: 0, // Will be set by service
      name: this.newShift.name!,
      projectId: this.newShift.projectId,
      projectName: this.newShift.projectName,
      assignedTo: assignedEmployees,
      startTime: this.newShift.startTime!,
      endTime: this.newShift.endTime!,
      recurrence: this.newShift.recurrence as 'Daily' | 'Weekly' | 'Custom' | undefined,
      location: this.newShift.location,
      active: true,
      date: this.newShift.date!
    };

    // Add the shift (this will auto-generate records for 7 days by default)
    this.shiftService.addShift(shiftToAdd, this.newShift.date!, 7);

    // Refresh data
    this.shifts = this.shiftService.getAllShifts();
    this.records = this.shiftService.getShiftRecords();
    this.onDateSelect(this.selectedDate);

    // Close dialog
    this.openForm = false;
    this.resetForm();
  }

}
