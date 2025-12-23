import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexStroke,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexLegend,
  ApexTooltip,
  ApexFill,
  ApexPlotOptions,
  ChartComponent,
} from 'ng-apexcharts';
import { formatDate } from '@angular/common';
import {
  SalesReportDTO,
  SalesReportBreakdownDTO,
  TopProductDTO,
  BranchSalesDTO,
  BranchDTO,
  CategoryDTO,
  PaymentMethodDTO,
} from '../../../models/interface';
import { ReportService } from '../../../service/report.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { forkJoin, Observable } from 'rxjs';

type PaymentMethodBreakdown = {
  paymentMethod: string;
  revenue: number;
  transactions: number;
};

export type BranchChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
  legend?: ApexLegend;
  tooltip: ApexTooltip;
  colors: string[];
};

export type ProductChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  title: ApexTitleSubtitle;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  colors: string[];
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
};

export type PaymentChartOptions = {
  series: number[];
  chart: ApexChart;
  labels: string[];
  dataLabels: ApexDataLabels;
  title: ApexTitleSubtitle;
  legend: ApexLegend;
  colors: string[];
  tooltip: ApexTooltip;
};

export type TrendChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
  legend: ApexLegend;
  tooltip: ApexTooltip;
  colors: string[];
};

@Component({
  selector: 'app-sales-report',
  templateUrl: './sales-report.component.html',
  styleUrls: ['./sales-report.component.scss'],
})
export class SalesReportComponent implements OnInit {
  getProductName(item: any): string {
    return item?.product?.name || 'N/A';
  }

  getVariant(item: any): string {
    return item?.productVariant?.name || 'Standard';
  }

  getQuantity(item: any): number {
    return item?.quantity || 0;
  }

  getUnitPrice(item: any): number {
    const variantPrice = item?.productVariant?.price;
    const productPrice = parseFloat(item?.product?.sellingPrice || '0');
    return variantPrice || productPrice || 0;
  }

  getPackageType(item: any): string {
    return item?.product?.packageType || 'Pcs';
  }

  getDeliveryStatusClass(item: any): string {
    const status = item?.order?.deliveryStatus || 'PENDING';
    const statusClasses: { [key: string]: string } = {
      'PENDING': 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold',
      'CONFIRMED': 'bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold',
      'PROCESSING': 'bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold',
      'OUT_FOR_DELIVERY': 'bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold',
      'DELIVERED': 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold',
      'CANCELLED': 'bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold',
      'REFUNDED': 'bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold';
  }

  getDeliveryStatus(item: any): string {
    return item?.order?.deliveryStatus || 'PENDING';
  }

  getCashierName(item: any): string {
    return item?.order?.cashier?.name || item?.order?.updatedBy || 'System';
  }

  getTotalAmount(item: any): number {
    return item?.totalPrice || 0;
  }
  @ViewChild('branchChart') branchChart!: ChartComponent;
  @ViewChild('productChart') productChart!: ChartComponent;
  @ViewChild('paymentChart') paymentChart!: ChartComponent;
  @ViewChild('trendChart') trendChart!: ChartComponent;
  @ViewChild('reportContent') reportContent!: ElementRef;

  public branchChartOptions!: BranchChartOptions;
  public productChartOptions!: ProductChartOptions;
  public paymentChartOptions!: PaymentChartOptions;
  public trendChartOptions!: TrendChartOptions;

  salesReport!: SalesReportDTO;
  previousPeriodReport!: SalesReportDTO; 

  // New properties for growth percentages
  totalRevenueGrowth: number | null = null;
  totalTransactionsGrowth: number | null = null;
  averageOrderValueGrowth: number | null = null;
  totalDiscountsGrowth: number | null = null;

  loading = true;
  selectedTab = 'overview';
  currentPage = 1;
  itemsPerPage = 10;

  // Filter panel properties
  isFilterFormOpen = false;
  selectedDateRange: string = 'today';
  paymentMethods: string[] = [];
  categories: CategoryDTO[] = [];

  // Export dropdown properties
  isExportDropdownOpen = false;

  Math = Math;

  // Form properties
  reportForm!: FormGroup;

  // Filter properties
  branches: BranchDTO[] = [];
Number: any;
orderItems: any;

  constructor(private reportService: ReportService, private fb: FormBuilder) {
    this.initChartOptions();
    this.createForm();
  }

  ngOnInit(): void {
    this.setDefaultDateRange();
    this.loadBranches();
    this.loadPaymentMethods();
    this.loadCategories();
  }

  createForm(): void {
    this.reportForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      dateRange: ['today'],
      branchIds: [[]],
      paymentMethodIds: [[]],
      categoryId: [null],
    });
  }

  setDefaultDateRange(): void {
    const today = new Date();
    const startDate = this.formatDateForInput(today);
    const endDate = this.formatDateForInput(today);

    this.reportForm.patchValue({
      startDate: startDate,
      endDate: endDate,
      dateRange: 'today',
    });
    this.selectedDateRange = 'today';
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toggleFilterForm(): void {
    this.isFilterFormOpen = !this.isFilterFormOpen;
  }

  loadBranches(): void {
    this.reportService.getBranches().subscribe({
      next: (branches) => {
        this.branches = branches || [];
        this.loadSalesData();
      },
      error: (err) => {
        console.error('Error loading branches:', err);
        this.branches = [];
        this.loadSalesData();
      },
    });
  }

  loadPaymentMethods(): void {
    this.paymentMethods = [
      'CASH',
      'CARD',
      'BANK_TRANSFER',
      'MOBILE_MONEY',
      'LOYALTY_POINTS',
      'VOUCHER',
      'GIFT_CARD',
      'CRYPTOCURRENCY',
    ];
  }

  loadCategories(): void {
    this.reportService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories || [];
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.categories = [];
      },
    });
  }

  onDateRangeChange(event: any): void {
    const range = event.target.value;
    this.selectedDateRange = range;
    const today = new Date();
    let startDate: Date;
    let endDate = today;

    switch (range) {
      case 'today':
        startDate = today;
        break;
      case 'last3Days':
        startDate = new Date();
        startDate.setDate(today.getDate() - 3);
        break;
      case 'last1Week':
        startDate = new Date();
        startDate.setDate(today.getDate() - 7);
        break;
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      default:
        return;
    }

    this.reportForm.patchValue({
      startDate: this.formatDateForInput(startDate),
      endDate: this.formatDateForInput(endDate),
    });
  }

  onCategoryChange(categoryId: number | null): void {
    this.reportForm.patchValue({ categoryId });
  }

  loadSalesData(): void {
    this.loading = true;
    const formValue = this.reportForm.value;

    const currentPeriod = this.getDateRange(formValue.startDate, formValue.endDate);
    const previousPeriod = this.getPreviousDateRange(currentPeriod.startDate, currentPeriod.endDate);

    const currentPayload = {
      startDate: currentPeriod.startDate.toISOString(),
      endDate: currentPeriod.endDate.toISOString(),
      branchIds: formValue.branchIds || [],
      cashierIds: [],
      paymentMethods: formValue.paymentMethodIds || [],
      categoryIds: formValue.categoryId ? [formValue.categoryId] : [],
    };

    const previousPayload = {
      startDate: previousPeriod.startDate.toISOString(),
      endDate: previousPeriod.endDate.toISOString(),
      branchIds: formValue.branchIds || [],
      cashierIds: [],
      paymentMethods: formValue.paymentMethodIds || [],
      categoryIds: formValue.categoryId ? [formValue.categoryId] : [],
    };

    forkJoin({
      current: this.reportService.getSalesPerformanceReport(currentPayload),
      previous: this.reportService.getSalesPerformanceReport(previousPayload),
    }).subscribe({
      next: (results) => {
        this.salesReport = results.current;
        this.previousPeriodReport = results.previous;
        this.loading = false;
        this.calculateGrowth();
        this.updateCharts();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading sales data:', err);
      },
    });
  }

  private getDateRange(startDateStr: string, endDateStr: string): { startDate: Date, endDate: Date } {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  private getPreviousDateRange(currentStartDate: Date, currentEndDate: Date): { startDate: Date, endDate: Date } {
    const diffInMilliseconds = currentEndDate.getTime() - currentStartDate.getTime();
    const previousEndDate = new Date(currentStartDate.getTime() - 1);
    const previousStartDate = new Date(previousEndDate.getTime() - diffInMilliseconds);

    return { startDate: previousStartDate, endDate: previousEndDate };
  }

  private calculateGrowth(): void {
    const currentRevenue = this.salesReport.totalRevenue || 0;
    const previousRevenue = this.previousPeriodReport.totalRevenue || 0;

    const currentTransactions = this.salesReport.totalTransactions || 0;
    const previousTransactions = this.previousPeriodReport.totalTransactions || 0;

    const currentAOV = this.salesReport.averageOrderValue || 0;
    const previousAOV = this.previousPeriodReport.averageOrderValue || 0;

    const currentDiscounts = this.salesReport.totalDiscounts || 0;
    const previousDiscounts = this.previousPeriodReport.totalDiscounts || 0;

    this.totalRevenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    this.totalTransactionsGrowth = previousTransactions > 0 ? ((currentTransactions - previousTransactions) / previousTransactions) * 100 : 0;
    this.averageOrderValueGrowth = previousAOV > 0 ? ((currentAOV - previousAOV) / previousAOV) * 100 : 0;
    this.totalDiscountsGrowth = previousDiscounts > 0 ? ((currentDiscounts - previousDiscounts) / previousDiscounts) * 100 : 0;
  }

  get paginatedBreakdown() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.salesReport?.breakdown?.slice(start, end) || [];
  }

  get totalPages() {
    return Math.ceil(
      (this.salesReport?.breakdown?.length || 0) / this.itemsPerPage
    );
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get cashiersPerformance() {
    const breakdown = this.salesReport?.breakdown || [];
    const map = new Map<number|string, { cashier: any; revenue: number; transactions: number; branches: Set<number> }>();

    breakdown.forEach((item) => {
      const cashierObj = item.cashier || (item as any).cashier || null;
      const cashierId = (cashierObj && cashierObj.id) || (item as any).cashierId || (cashierObj && cashierObj.name) || 'unknown';
      const key = cashierId ?? 'unknown';

      if (!map.has(key)) {
        map.set(key, { cashier: cashierObj || { id: key, name: cashierObj?.name || 'Unknown' }, revenue: 0, transactions: 0, branches: new Set<number>() });
      }

      const entry = map.get(key)!;
      entry.revenue += item.revenue || 0;
      entry.transactions += item.transactions || 0;
      if (item.branch && (item.branch as any).id) entry.branches.add((item.branch as any).id);
    });

    return Array.from(map.values()).map((e) => ({
      cashier: e.cashier,
      revenue: e.revenue,
      transactions: e.transactions,
      averageOrderValue: e.transactions ? e.revenue / e.transactions : 0,
      branchesCount: e.branches.size,
    }));
  }

  getChannel(item: any): string {
    // Prefer explicit channel field
    if (item.channel) return String(item.channel);

    //  check common flags returned by different endpoints
    if (item.order?.isOnline === true || item.isOnline === true) return 'Online';
    if (item.order?.deliveryStatus && item.order.deliveryStatus !== 'PENDING') return 'Online';

    // check kitchen-specific flags used in app
    if (item.isKitchen === true || item.order?.kitchenOrder === true) return 'Kitchen';

    // If payment method or other hints indicate walk-in
    const pm = (item.paymentMethod || '').toString().toLowerCase();
    if (pm.includes('cash') || pm.includes('card') || pm.includes('gift_card') || pm.includes('voucher')) return 'Walk-in';

    //  if there's a salesperson or table info, treat as Walk-in
    if (item.salesperson || item.table || item.order?.table) return 'Walk-in';

    return 'Unknown';
  }

  initChartOptions() {
    this.branchChartOptions = {
      series: [{ name: 'Revenue', data: [] }],
      chart: { type: 'bar', height: 350, toolbar: { show: false } },
      colors: ['#4F46E5'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      title: {
        text: 'Revenue by Branch',
        align: 'left',
        style: { fontSize: '16px', fontWeight: '600', color: '#374151' },
      },
      xaxis: { categories: [] },
      yaxis: {
        title: {
          text: 'Revenue (₦)',
          style: { fontSize: '14px', fontWeight: '500', color: '#6B7280' },
        },
      },
      tooltip: { y: { formatter: (val: number) => this.formatCurrency(val) } },
    };

    this.productChartOptions = {
      series: [{ name: 'Revenue', data: [] }],
      chart: { type: 'bar', height: 350, toolbar: { show: false } },
      plotOptions: {
        bar: { horizontal: true, barHeight: '70%', distributed: false },
      },
      colors: ['#10B981'],
      dataLabels: {
        enabled: true,
        formatter: (val: number) => this.formatCurrency(val, false),
        textAnchor: 'start',
        style: { fontSize: '12px', colors: ['#fff'] },
        offsetX: 0,
      },
      stroke: { width: 0 },
      xaxis: { categories: [] },
      yaxis: { labels: { show: true } },
      title: {
        text: 'Top Selling Products',
        align: 'left',
        style: { fontSize: '16px', fontWeight: '600', color: '#374151' },
      },
      tooltip: { y: { formatter: (val: number) => this.formatCurrency(val) } },
      fill: { opacity: 1 },
    };

    this.paymentChartOptions = {
      series: [],
      chart: { type: 'donut', height: 350 },
      labels: [],
      dataLabels: {
        enabled: true,
        formatter: (val: number, opts?: any) =>
          `${opts.w.config.labels[opts.seriesIndex]}: ${this.formatCurrency(
            val,
            false
          )}`,
      },
      colors: ['#3B82F6', '#F97316', '#14B8A6', '#EC4899', '#8B5CF6'],
      title: {
        text: 'Payment Method Distribution',
        align: 'left',
        style: { fontSize: '16px', fontWeight: '600', color: '#374151' },
      },
      legend: { position: 'bottom' },
      tooltip: { y: { formatter: (val: number) => this.formatCurrency(val) } },
    };

    this.trendChartOptions = {
      series: [
        { name: 'Revenue', data: [] },
        { name: 'Transactions', data: [] },
      ],
      chart: { height: 350, type: 'area', toolbar: { show: false } },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      colors: ['#6366F1', '#F59E0B'],
      title: {
        text: `Sales Trend`,
        align: 'left',
        style: { fontSize: '16px', fontWeight: '600', color: '#374151' },
      },
      xaxis: { type: 'category', categories: [] },
      yaxis: {
        title: {
          text: 'Amount (₦)',
          style: { fontSize: '14px', fontWeight: '500', color: '#6B7280' },
        },
      },
      legend: { position: 'top', horizontalAlign: 'right' },
      tooltip: { y: { formatter: (val: number) => this.formatCurrency(val) } },
    };
  }

  updateCharts() {
    if (!this.salesReport) return;
    const formValue = this.reportForm.value;

    // Filter data for charts based on form selection
    const filteredProducts = formValue.categoryId
      ? this.salesReport.topSellingProducts.filter(
          (p) => p.product.category === formValue.categoryId
        )
      : this.salesReport.topSellingProducts;

    const filteredPayments = formValue.paymentMethodIds.length > 0
      ? this.salesReport.paymentMethodBreakdown.filter((p) =>
          formValue.paymentMethodIds.includes(p.paymentMethod)
        )
      : this.salesReport.paymentMethodBreakdown;

    // Update Product Chart
    const productMap = new Map<string, number>();
    filteredProducts.forEach((product) => {
      const productName = product.product.name;
      const currentRevenue = productMap.get(productName) || 0;
      productMap.set(productName, currentRevenue + product.revenue);
    });
    const sortedProducts = Array.from(productMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    this.productChartOptions.series = [
      { name: 'Revenue', data: sortedProducts.map((p) => p[1]) },
    ];
    this.productChartOptions.xaxis = {
      categories: sortedProducts.map((p) => p[0]),
    };

    // Update Payment Chart
    this.paymentChartOptions.series = filteredPayments.map((p) => p.revenue);
    this.paymentChartOptions.labels = filteredPayments.map((p) => p.paymentMethod);

    // Update other charts as before
    this.branchChartOptions.series = [
      {
        name: 'Revenue',
        data: this.salesReport.totalSalesPerBranch.map((b) => b.totalRevenue),
      },
    ];
    this.branchChartOptions.xaxis = {
      categories: this.salesReport.totalSalesPerBranch.map((b) => b.branch.name),
    };
    
    this.trendChartOptions.title = {
      ...this.trendChartOptions.title,
      text: `Sales Trend (${formValue.startDate} to ${formValue.endDate})`,
    };
    const groupedByDate = this.groupBreakdownByDate(this.salesReport.breakdown);
    const dates = Array.from(groupedByDate.keys()).sort((a, b) => a - b);
    this.trendChartOptions.series = [
      {
        name: 'Revenue',
        data: dates.map((date) => {
          const group = groupedByDate.get(date);
          return group ? group.revenue : 0;
        }),
      },
      {
        name: 'Transactions',
        data: dates.map((date) => {
          const group = groupedByDate.get(date);
          return group ? group.transactions : 0;
        }),
      },
    ];
    this.trendChartOptions.xaxis = {
      categories: dates.map((date) => formatDate(new Date(date), 'MMM dd', 'en-US')),
    };

    // Re-render charts
    if (this.branchChart) this.branchChart.updateOptions(this.branchChartOptions);
    if (this.productChart) this.productChart.updateOptions(this.productChartOptions);
    if (this.paymentChart) this.paymentChart.updateOptions(this.paymentChartOptions);
    if (this.trendChart) this.trendChart.updateOptions(this.trendChartOptions);
  }

  groupBreakdownByDate(breakdown: SalesReportBreakdownDTO[]) {
    const groups = new Map<number, { revenue: number; transactions: number }>();

    breakdown.forEach((item) => {
      const dateKey = new Date(item.date).getTime();
      if (!groups.has(dateKey)) {
        groups.set(dateKey, { revenue: 0, transactions: 0 });
      }
      const group = groups.get(dateKey);
      if (group) {
        group.revenue += item.revenue;
        group.transactions += item.transactions;
      }
    });
    return groups;
  }

  setTab(tab: string) {
    this.selectedTab = tab;
    this.currentPage = 1;
  }

  showTotalRevenueDetails() {
    this.setTab('details');
  }

  showTotalTransactionsDetails() {
    this.setTab('details');
  }

  showTotalDiscountDetails() {
    this.setTab('details');
  }

  onSubmit() {
    this.isFilterFormOpen = false;
    this.loadSalesData();
  }

  resetFilters() {
    this.reportForm.reset();
    this.setDefaultDateRange();
    this.reportForm.patchValue({
      branchIds: [],
      paymentMethodIds: [],
      categoryId: null,
    });
    this.loadSalesData();
  }

  formatCurrency(amount: number, includeSymbol: boolean = true): string {
    return (
      (includeSymbol ? '₦' : '') +
      amount.toLocaleString('en-NG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    );
  }

  toggleExportDropdown(): void {
    this.isExportDropdownOpen = !this.isExportDropdownOpen;
  }

  exportReport(format: 'pdf' | 'excel') {
    this.isExportDropdownOpen = false;
    if (!this.reportContent || !this.reportContent.nativeElement) {
      console.error('Report content element not found for PDF export.');
      alert(
        'Could not find report content. Please ensure it has the correct ID.'
      );
      return;
    }
    if (format === 'pdf') {
      this.exportToPdf();
    } else if (format === 'excel') {
      this.exportToExcel();
    }
  }

  private exportToPdf() {
    html2canvas(this.reportContent.nativeElement).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      doc.save('sales-report.pdf');
    });
  }

  private exportToExcel() {
    const dataToExport = this.salesReport.breakdown.map((item) => {
      return {
        date: formatDate(new Date(item.date), 'shortDate', 'en-US'),
        branch: item.branch?.name || 'N/A',
        cashier: item.cashier?.name || 'N/A',
        channel: this.getChannel(item),
        paymentMethod: item.paymentMethod || 'N/A',
        transactions: item.transactions,
        revenue: item.revenue,
        discounts: item.discounts,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SalesReport');
    XLSX.writeFile(workbook, 'sales-report.xlsx');
  }

  get report() {
    return this.salesReport;
  }
}