import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-hr-dashboard',
  templateUrl: './hr-dashboard.component.html',
  styleUrls: ['./hr-dashboard.component.scss']
})
export class HrDashboardComponent implements OnInit {

  /* --------------------------------------------------
     NOTIFICATIONS
  -------------------------------------------------- */
  showNotifications = false;
  hasNewNotifications = true;

  notifications = [
    { message: 'New leave request from Ada C.', time: '2h ago' },
    { message: 'Payroll processed for October.', time: '1d ago' }
  ];

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) this.hasNewNotifications = false;
  }

  /* --------------------------------------------------
     SUMMARY STATS
  -------------------------------------------------- */
  hrStats = {
    totalEmployees: 120,
    active: 110,
    onLeave: 5,
    pendingRequests: 5
  };

  /* --------------------------------------------------
     USER PROFILE CARD
  -------------------------------------------------- */
  public userInfo = {
    name: 'Okafor Chukwuemeka',
    role: 'Software Engineer',
    department: 'Sales',
    employeeId: 'tok123abc',
    bankName: 'GTBank',
    daysWorked: 22,
    phoneNumber: '+234 801 234 5678'
  };

  /* --------------------------------------------------
     LEAVE REQUESTS
  -------------------------------------------------- */
  leaveRequests = [
    { name: 'Ada C.', type: 'Annual Leave', date: '2025-11-10', status: 'Pending' },
    { name: 'James K.', type: 'Sick Leave', date: '2025-11-01', status: 'Approved' }
  ];

  showLeaveModal = false;

  openLeaveModal() {
    this.showLeaveModal = true;
  }

  closeLeaveModal() {
    this.showLeaveModal = false;
  }

  /* --------------------------------------------------
     EMPLOYEE TABLE
  -------------------------------------------------- */
  employeeList = [
    { name: 'Ada C.', department: 'IT', status: 'Active' },
    { name: 'James K.', department: 'Finance', status: 'Active' },
    { name: 'Maya P.', department: 'Marketing', status: 'On Leave' }
  ];

  /* --------------------------------------------------
     ADD EMPLOYEE MODAL
  -------------------------------------------------- */
  showAddEmployeeModal = false;

  newEmployee = {
    name: '',
    department: '',
    status: 'Active'
  };

  openAddEmployeeModal() {
    this.showAddEmployeeModal = true;
  }

  closeAddEmployeeModal() {
    this.showAddEmployeeModal = false;
  }

  submitEmployee() {
    if (this.newEmployee.name.trim() !== '' && this.newEmployee.department.trim() !== '') {

      this.employeeList.push({ ...this.newEmployee });

      // Reset form
      this.newEmployee = { name: '', department: '', status: 'Active' };

      // Close modal
      this.showAddEmployeeModal = false;
    }
  }

  /* --------------------------------------------------
     EMPLOYEE ACTION MODALS (View / Promote / Remove)
  -------------------------------------------------- */
  selectedEmployee: any = null;

  showViewModal = false;
  showPromoteModal = false;
  showRemoveModal = false;

  promotionRole = '';

  // VIEW EMPLOYEE
  viewEmployee(emp: any) {
    this.selectedEmployee = emp;
    this.showViewModal = true;
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedEmployee = null;
  }

  // PROMOTE EMPLOYEE
  promoteEmployee(emp: any) {
    this.selectedEmployee = emp;
    this.promotionRole = '';
    this.showPromoteModal = true;
  }

  closePromoteModal() {
    this.showPromoteModal = false;
  }

  confirmPromotion() {
    if (this.promotionRole.trim() === '') return;

    // Dummy logic: updating department or role
    this.selectedEmployee.department = this.promotionRole;

    this.showPromoteModal = false;
  }

  // REMOVE EMPLOYEE
  removeEmployee(emp: any) {
    this.selectedEmployee = emp;
    this.showRemoveModal = true;
  }

  closeRemoveModal() {
    this.showRemoveModal = false;
  }

 confirmRemove() {
  if (!this.selectedEmployee) {
    console.warn('confirmRemove called but no selectedEmployee');
    this.showRemoveModal = false;
    return;
  }

  // Remove by a stable identifier (here: name).
  // Preferably use an id property if you have one.
  const key = this.selectedEmployee.name;
  const idx = this.employeeList.findIndex(e => e.name === key);

  if (idx > -1) {
    this.employeeList.splice(idx, 1);
    console.log(`Removed employee: ${key}`);
  } else {
    // Fallback: attempt object identity filter
    this.employeeList = this.employeeList.filter(e => e !== this.selectedEmployee);
    console.warn('Fallback removal attempted for', key);
  }

  // Close modal and clear selection
  this.showRemoveModal = false;
  this.selectedEmployee = null;
}


  /* --------------------------------------------------
     CHARTS (BAR + PIE)
  -------------------------------------------------- */
  barChartOptions: any = {};
  pieChartOptions: any = {};

  ngOnInit(): void {
    this.initBarChart();
    this.initPieChart();
  }

  initBarChart() {
    this.barChartOptions = {
      series: [
        {
          name: 'Employees',
          data: [25, 18, 40, 22, 15]
        }
      ],
      chart: { type: 'bar', height: 320, toolbar: { show: false } },
      xaxis: { categories: ['HR', 'Finance', 'IT', 'Marketing', 'Support'] },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2 },
      grid: { borderColor: '#e6e6e6' },
      tooltip: {
        y: { formatter: (val: number) => `${val} Employees` }
      },
      fill: { opacity: 1 }
    };
  }

  initPieChart() {
    this.pieChartOptions = {
      series: [60, 40],
      chart: { type: 'pie', height: 320 },
      labels: ['Male', 'Female'],
      tooltip: {
        y: { formatter: (val: number) => `${val}%` }
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: { width: '100%' },
            legend: { position: 'bottom' }
          }
        }
      ],
      fill: { opacity: 1 }
    };
  }

  generateReport() {
  let report = '--- HR DASHBOARD REPORT ---\n\n';

  report += `Total Employees: ${this.hrStats.totalEmployees}\n`;
  report += `Active: ${this.hrStats.active}\n`;
  report += `On Leave: ${this.hrStats.onLeave}\n`;
  report += `Pending Requests: ${this.hrStats.pendingRequests}\n\n`;

  report += '--- Leave Requests ---\n';
  this.leaveRequests.forEach((req, i) => {
    report += `${i + 1}. ${req.name} | ${req.type} | ${req.date} | ${req.status}\n`;
  });

  report += '\n--- Employee List ---\n';
  this.employeeList.forEach((emp, i) => {
    report += `${i + 1}. ${emp.name} | ${emp.department} | ${emp.status}\n`;
  });

  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'HR_Report.txt';
  a.click();

  URL.revokeObjectURL(url);
}

}

