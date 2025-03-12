import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss'],
})
export class SalesComponent implements OnInit {
  filterForm: FormGroup;
  cashiers: string[] = ['All', 'John', 'Ben', 'Winifred', 'Conrad'];
  selectedCashier: string | null = null;
  statusOptions: string[] = ['Completed', 'Pending', 'Void'];
  selectedStatus: string[] = [];
  searchTerm: string | null = null;
  openSale: boolean = false;
  selectedTransaction: any = null;
  isSearchActive: boolean = false;
  isCalendarOpen = false;

  // Date picker
  calendarVisible: boolean = false;
  startDate: Date = new Date();
  endDate: Date = new Date();
  displayDateLabel: string = 'Today';
  currentMonth: string = '';
  calendarDays: Date[] = [];
  dateOptions = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'this_week' },
    { label: 'Last Week', value: 'last_week' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
  ];
  dateSelectionMode: 'start' | 'end' | null = null;
  selectedDays: Date[] = [];

  // Transactions
  transactions: any[] = [];
  filteredTransactions: any[] = [];
  grossSalesTotal: number = 0;
  summaryOptions: string[] = [
    'Today',
    'Yesterday',
    'This Week',
    'Last Week',
    'This Month',
    'Last Month',
  ];

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      cashier: ['all'],
      status: [[]],
      dateRange: ['today'],
    });

    this.initializeSampleData();
    this.updateCalendar();
  }

  ngOnInit(): void {
    this.filterTransactions();
  }

  navigateToSale() {
    this.openSale = !this.openSale;
    if (!this.openSale) {
      this.selectedTransaction = null;
    }
  }

  goToSaleDetails(transaction: any) {
    this.selectedTransaction = transaction;
    this.openSale = true;
  }

  initializeSampleData() {
    // Sample transaction data
    this.transactions = [
      {
        orderId: 'ORD-001',
        cashier: 'John',
        transactionOrderId: 'TRX-1001',
        status: 'Completed',
        date: new Date(),
        amount: 125.5,
      },
      {
        orderId: 'ORD-002',
        cashier: 'Ben',
        transactionOrderId: 'TRX-1002',
        status: 'Pending',
        date: new Date(),
        amount: 75.25,
      },
      {
        orderId: 'ORD-003',
        cashier: 'Conrad',
        transactionOrderId: 'TRX-1003',
        status: 'Completed',
        date: new Date(),
        amount: 210.0,
      },
      {
        orderId: 'ORD-004',
        cashier: 'Winifred',
        transactionOrderId: 'TRX-1004',
        status: 'Void',
        date: new Date(),
        amount: 50.75,
      },
    ];

    this.filteredTransactions = [...this.transactions];
    this.grossSalesTotal = this.calculateTotal(this.filteredTransactions);
  }

  // Search and filter methods
  handleSearchChange() {
    this.isSearchActive = !!this.searchTerm;
    this.filterTransactions();
  }

  clearSearch() {
    if (this.isSearchActive) {
      this.searchTerm = '';
      this.isSearchActive = false;
      this.filterTransactions();
    }
  }

  // Filter methods
  filterTransactions() {
    this.filteredTransactions = this.transactions.filter((transaction) => {
      // Filter by search term
      const matchesSearch =
        !this.searchTerm ||
        transaction.orderId
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        transaction.transactionOrderId
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        transaction.cashier
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase());

      // Filter by selected status
      const matchesStatus =
        this.selectedStatus.length === 0 ||
        this.selectedStatus.includes(transaction.status);

      // Filter by cashier
      const matchesCashier =
        !this.selectedCashier ||
        this.selectedCashier === 'All' ||
        transaction.cashier === this.selectedCashier;

      // Filter by date range
      const transactionDate = new Date(transaction.date);
      const startOfDay = new Date(this.startDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(this.endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const matchesDateRange =
        transactionDate >= startOfDay && transactionDate <= endOfDay;

      return (
        matchesSearch && matchesStatus && matchesCashier && matchesDateRange
      );
    });

    // Recalculate total
    this.grossSalesTotal = this.calculateTotal(this.filteredTransactions);
  }

  onCashierChange(cashier: string) {
    this.filterForm.get('cashier')?.setValue(cashier);
    this.filterTransactions();
  }

  // Date picker methods
  toggleCalendar() {
    this.calendarVisible = !this.calendarVisible;
    if (this.calendarVisible) {
      this.updateCalendar();
    }
  }

  updateCalendar() {
    const year = this.startDate.getFullYear();
    const month = this.startDate.getMonth();

    this.currentMonth = new Date(year, month, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    // Generate calendar days
    this.calendarDays = this.generateCalendarDays(year, month);
  }

  generateCalendarDays(year: number, month: number): Date[] {
    const days: Date[] = [];

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);

    // Add previous month days
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek; i > 0; i--) {
      days.push(new Date(year, month, 1 - i));
    }

    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add next month days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows of 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }

  getDayClass(day: Date): string {
    const classes = [];

    // Current month or other month
    if (day.getMonth() !== this.startDate.getMonth()) {
      classes.push('text-gray-300');
    } else {
      classes.push('text-gray-700');
    }

    // Check if day is in the selected range
    const dayTime = day.getTime();
    const startTime = new Date(this.startDate.setHours(0, 0, 0, 0)).getTime();
    const endTime = new Date(this.endDate.setHours(23, 59, 59, 999)).getTime();

    if (dayTime >= startTime && dayTime <= endTime) {
      classes.push('bg-blue-100');

      // Highlight start and end dates more prominently
      if (dayTime === startTime) {
        classes.push('bg-blue-500 text-white');
      }
      if (dayTime === endTime) {
        classes.push('bg-blue-500 text-white');
      }
    }

    // Is today
    if (this.isToday(day)) {
      classes.push('font-bold');
      if (dayTime < startTime || dayTime > endTime) {
        classes.push('text-blue-600');
      }
    }

    return classes.join(' ');
  }

  isToday(day: Date): boolean {
    const today = new Date();
    return (
      day.getDate() === today.getDate() &&
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear()
    );
  }

  selectDay(day: Date) {
    // If no date is selected, set both start and end to the selected date
    if (!this.dateSelectionMode) {
      this.startDate = new Date(day);
      this.endDate = new Date(day);
      this.dateSelectionMode = 'end'; // Next click will select the end date
    } else if (this.dateSelectionMode === 'end') {
      // If start date is already selected, set the end date
      const selectedTime = day.getTime();
      const startTime = this.startDate.getTime();

      if (selectedTime < startTime) {
        // If selected date is before start date, swap them
        this.endDate = new Date(this.startDate);
        this.startDate = new Date(day);
      } else {
        this.endDate = new Date(day);
      }

      this.dateSelectionMode = null;

      // Update the display label
      if (this.startDate.getTime() === this.endDate.getTime()) {
        this.displayDateLabel = this.formatDate(this.startDate);
      } else {
        this.displayDateLabel = `${this.formatDate(
          this.startDate
        )} - ${this.formatDate(this.endDate)}`;
      }

      this.calendarVisible = false;
      this.filterTransactions();
    }

    this.updateCalendar();
  }

  navigateDate(direction: number) {
    // Implement date navigation based on current view (day, week, month)
    // For simplicity, let's assume we're navigating by day
    this.startDate = new Date(
      this.startDate.setDate(this.startDate.getDate() + direction)
    );
    this.endDate = new Date(this.startDate);
    this.displayDateLabel = this.formatDate(this.startDate);
    this.updateCalendar();
    this.filterTransactions();
  }

  navigateMonth(direction: number) {
    const year = this.startDate.getFullYear();
    const month = this.startDate.getMonth() + direction;

    this.startDate = new Date(year, month, 1);
    this.updateCalendar();
  }

  updateStartDate(dateString: string) {
    const newDate = new Date(dateString);
    if (!isNaN(newDate.getTime())) {
      this.startDate = newDate;

      // If start date is after end date, update end date
      if (this.startDate > this.endDate) {
        this.endDate = new Date(this.startDate);
      }
    }
  }

  updateEndDate(dateString: string) {
    const newDate = new Date(dateString);
    if (!isNaN(newDate.getTime())) {
      // If end date is before start date, update start date
      if (newDate < this.startDate) {
        this.startDate = new Date(newDate);
        this.endDate = new Date(newDate);
      } else {
        this.endDate = newDate;
      }
    }
  }

  applyCustomDateRange() {
    // Update the display label
    if (this.startDate.getTime() === this.endDate.getTime()) {
      this.displayDateLabel = this.formatDate(this.startDate);
    } else {
      this.displayDateLabel = `${this.formatDate(
        this.startDate
      )} - ${this.formatDate(this.endDate)}`;
    }

    this.calendarVisible = false;
    this.filterTransactions();
  }

  selectDateOption(option: any) {
    const today = new Date();

    switch (option.value) {
      case 'today':
        this.startDate = new Date(today);
        this.endDate = new Date(today);
        this.displayDateLabel = 'Today';
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        this.startDate = new Date(yesterday);
        this.endDate = new Date(yesterday);
        this.displayDateLabel = 'Yesterday';
        break;
      case 'this_week':
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        this.startDate = new Date(thisWeekStart);
        this.endDate = new Date(today);
        this.displayDateLabel = 'This Week';
        break;
      case 'last_week':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
        this.startDate = new Date(lastWeekStart);
        this.endDate = new Date(lastWeekEnd);
        this.displayDateLabel = 'Last Week';
        break;
      case 'this_month':
        const thisMonthStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );
        this.startDate = new Date(thisMonthStart);
        this.endDate = new Date(today);
        this.displayDateLabel = 'This Month';
        break;
      case 'last_month':
        const lastMonthStart = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        );
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        this.startDate = new Date(lastMonthStart);
        this.endDate = new Date(lastMonthEnd);
        this.displayDateLabel = 'Last Month';
        break;
    }

    this.dateSelectionMode = null;
    this.updateCalendar();
    this.calendarVisible = false;
    this.filterTransactions();
  }

  // Utility methods
  formatDate(date: Date): string {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatCurrency(amount: number): string {
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  calculateTotal(transactions: any[]): number {
    return transactions
      .filter((t) => t.status !== 'Void')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  // Action methods
  exportReport() {
    // Implement export functionality
    console.log('Exporting report...');
  }

  viewTransaction(transaction: any) {
    // Implement view transaction details
    console.log('Viewing transaction:', transaction);
  }

  printReceipt(transaction: any) {
    // Implement print receipt
    console.log('Printing receipt for:', transaction);
  }
}
