import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexGrid,
  ApexStroke,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexFill,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexPlotOptions,
  ApexYAxis
} from 'ng-apexcharts';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ReportService } from '../../../service/report.service';
import {
  BranchReportDTO,
  BranchPerformanceDTO,
  BranchReportRequestDTO,
  BranchDTO,
  ChartOptions
} from '../../../models/interface';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

interface DropdownData {
  label: string;
  value: any;
}

@Component({
  selector: 'app-finance-report',
  templateUrl: './finance-report.component.html',
  styleUrl: './finance-report.component.scss'
})
export class FinanceReportComponent implements OnInit {
  @ViewChild('reportContent') reportContent!: ElementRef;
  filterForm!: FormGroup;
  reportData!: BranchReportDTO;
  selectedBranch!: BranchPerformanceDTO;
  isLoading = false;
  totalCompanyRevenue = 0;
  averageGrowth = 0;
  totalCustomers = 0;
  totalProducts = 0;
  isExportDropdownOpen = false;

  // New state variables for dropdowns and tooltips
  isDropdownOpen: { [key: string]: boolean } = {
    totalRevenue: false,
    averageGrowth: false
  };
  dropdownData: { [key: string]: DropdownData[] } = {
    totalRevenue: [],
    averageGrowth: []
  };
  hoveringInfo: { [key: string]: boolean } = {
    totalCustomers: false,
    totalProducts: false
  };

  public revenueChartOptions!: ChartOptions;
  public growthChartOptions!: ChartOptions;
  public categoryChartOptions!: ChartOptions;
  public trendChartOptions!: ChartOptions;

  Math = Math;
  filterFormOpen = false;

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService
  ) { }

  ngOnInit() {
    this.initFilterForm();
    this.loadReportData();
  }

  openFilterForm() {
    this.filterFormOpen = !this.filterFormOpen;
  }

  getBranchReport(request: BranchReportRequestDTO): Observable<BranchReportDTO> {
    const formattedRequest: BranchReportRequestDTO = {
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
      compareWithPrevious: request.compareWithPrevious
    };
    return this.reportService.getBranchPerformanceReport(formattedRequest);
  }

  initFilterForm(): void {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    this.filterForm = this.fb.group({
      startDate: [lastMonth],
      endDate: [today],
      compareWithPrevious: [true]
    });
  }

  loadReportData(): void {
    this.isLoading = true;
    this.getBranchReport(this.filterForm.value).subscribe({
      next: (data: BranchReportDTO) => {
        this.reportData = data;
        this.calculateSummaryMetrics();
        this.initializeCharts();
        this.prepareDropdownData();

        if (this.reportData.branches.length > 0) {
          this.selectedBranch = this.reportData.branches[0];
          this.loadBranchDetails(this.selectedBranch.branch.id);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading report data:', error);
        this.isLoading = false;
        // Handle error case by providing empty data
        this.reportData = { branches: [] };
        this.calculateSummaryMetrics();
        this.initializeCharts();
        this.prepareDropdownData();
      }
    });
  }

  calculateSummaryMetrics(): void {
    const branches = this.reportData?.branches || [];

    this.totalCompanyRevenue = branches.reduce((sum: number, branch: BranchPerformanceDTO) => sum + (branch.totalRevenue || 0), 0);

    const branchesWithGrowth = branches.filter((b: BranchPerformanceDTO) => b.revenueGrowthPercent !== undefined && b.revenueGrowthPercent !== null);
    const totalGrowth = branchesWithGrowth.reduce((sum: number, branch: BranchPerformanceDTO) => sum + (branch?.revenueGrowthPercent || 0), 0);
    this.averageGrowth = branchesWithGrowth.length > 0 ? totalGrowth / branchesWithGrowth.length : 0;

    this.totalCustomers = branches.reduce((sum: number, branch: BranchPerformanceDTO) => sum + (branch.customerFootfall || 0), 0);
    this.totalProducts = branches.reduce((sum: number, branch: BranchPerformanceDTO) => sum + (branch.productMovement || 0), 0);
  }

  selectBranch(branch: BranchPerformanceDTO): void {
    this.selectedBranch = branch;
    this.loadBranchDetails(branch.branch.id);
  }

  loadBranchDetails(branchId: number): void {
    // Load monthly trend data
    this.reportService.getBranchMonthlyTrend(branchId).subscribe(trendData => {
      this.updateTrendChart(trendData);
    });
  }

  onFilterChange(): void {
    this.loadReportData();
  }

  initializeCharts(): void {
    const branches = this.reportData?.branches || [];
    const branchNames = branches.map((b: BranchPerformanceDTO) => b.branch.name);
    const revenues = branches.map((b: BranchPerformanceDTO) => b.totalRevenue);

    // Revenue Comparison Chart
    this.revenueChartOptions = {
      series: [{
        name: 'Revenue',
        data: revenues
      }],
      chart: {
        type: 'bar',
        height: 350,
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        // animations: { enabled: true, easing: 'easeinout', speed: 800, animateGradually: { enabled: true, delay: 150 }, dynamicAnimation: { enabled: true, speed: 350 } }
      },
      colors: ['#3B82F6'],
      plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 5, dataLabels: { position: 'top' } } },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: { categories: branchNames, labels: { style: { colors: '#64748B', fontSize: '12px' } } },
      yaxis: {
        title: { text: 'Revenue (₦)', style: { fontSize: '14px', fontWeight: 500, color: '#64748B' } },
        labels: {
          formatter: (val: number) => this.formatCurrency(val),
          style: { colors: '#64748B' }
        }
      }
    };

    // Growth Chart
    this.growthChartOptions = {
      series: [{
        name: 'Growth %',
        data: branches.map((b: BranchPerformanceDTO) => b.revenueGrowthPercent || 0)
      }],
      chart: {
        type: 'bar',
        height: 350,
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        // animations: { enabled: true, easing: 'easeinout', speed: 800, animateGradually: { enabled: true, delay: 150 }, dynamicAnimation: { enabled: true, speed: 350 } }
      },
      colors: branches.map((b: BranchPerformanceDTO) => (b.revenueGrowthPercent || 0) >= 0 ? '#10B981' : '#EF4444'),
      plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 5, distributed: true } },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => val.toFixed(1) + '%',
        style: { fontSize: '12px', colors: ['#fff'] },
        background: { enabled: true, foreColor: '#333', padding: 4, borderRadius: 2, borderWidth: 1, borderColor: '#fff', opacity: 0.9 }
      },
      stroke: { show: true, width: 1, colors: ['transparent'] },
      xaxis: { categories: branches.map((b: BranchPerformanceDTO) => b.branch.name), labels: { style: { colors: '#64748B', fontSize: '12px' } } },
      yaxis: {
        title: { text: 'Growth (%)', style: { fontSize: '14px', fontWeight: 500, color: '#64748B' } },
        labels: { formatter: (val: number) => val.toFixed(2) + '%', style: { colors: '#64748B' } }
      },
      fill: {
        opacity: 1, type: 'gradient', gradient: { shade: 'dark', type: 'vertical', shadeIntensity: 0.3, gradientToColors: undefined, inverseColors: false, opacityFrom: 1, opacityTo: 0.8, stops: [0, 100] }
      },
      tooltip: { y: { formatter: (val: number) => val.toFixed(2) + '%', } }
    };

  }

  updateTrendChart(trendData: any): void {
    this.trendChartOptions = {
      series: [
        { name: 'Revenue', type: 'line', data: trendData.revenue },
        { name: 'Customers', type: 'column', data: trendData.customers }
      ],
      chart: { height: 350, type: 'line', stacked: false, fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
      stroke: { width: [3, 0], curve: 'smooth' },
      plotOptions: { bar: { columnWidth: '50%' } },
      colors: ['#3B82F6', '#A855F7'],
      fill: { opacity: [1, 0.7], gradient: { inverseColors: false, shade: 'light', type: 'vertical', opacityFrom: 0.85, opacityTo: 0.55 } },
      labels: trendData.months,
      xaxis: { type: 'category', labels: { style: { colors: '#64748B', fontSize: '12px' } } },
      yaxis: [
        { title: { text: 'Revenue', style: { fontSize: '14px', fontWeight: 500, color: '#64748B' } }, labels: { formatter: (val: number) => this.formatCurrency(val), style: { colors: '#64748B' } } },
        { opposite: true, title: { text: 'Customers', style: { fontSize: '14px', fontWeight: 500, color: '#64748B' } }, labels: { style: { colors: '#64748B' } } }
      ],
      tooltip: {
        shared: true, intersect: false, y: { formatter: (val: number, { seriesIndex }: any) => { return seriesIndex === 0 ? this.formatCurrency(val) : val.toLocaleString(); } }
      },
      legend: { position: 'top', horizontalAlign: 'left', fontSize: '14px', fontWeight: 500, 
        // markers: { width: 12, height: 12, radius: 12 } 
      },
      grid: { borderColor: '#E2E8F0', strokeDashArray: 4 }
    };
  }

  formatCurrency(amount: number): string {
    return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  formatPercent(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100);
  }

  getGrowthClass(growth: number): string {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  }

  getGrowthIcon(growth: number): string {
    return growth >= 0 ? 'trending_up' : 'trending_down';
  }

  // --- New Export Methods ---
  toggleExportDropdown(): void {
    this.isExportDropdownOpen = !this.isExportDropdownOpen;
  }

  exportReport(format: 'pdf' | 'excel') {
    this.isExportDropdownOpen = false;
    if (!this.reportContent || !this.reportContent.nativeElement) {
      console.error('Report content element not found for export.');
      alert('Could not find report content. Please ensure it has the correct template reference variable (#reportContent).');
      return;
    }

    if (format === 'pdf') {
      this.exportToPdf('main');
    } else if (format === 'excel') {
      this.exportToExcel('main');
    }
  }

  exportSingleBranchReport(format: 'pdf' | 'excel') {
    if (!this.selectedBranch) {
      alert('Please select a branch to export a detailed report.');
      return;
    }
    if (format === 'pdf') {
      // For single branch PDF export, you'd need a separate #branchContent template reference variable
      alert('Single branch PDF export is not implemented in this example.');
    } else if (format === 'excel') {
      this.exportToExcel('single');
    }
  }

  private exportToPdf(type: 'main' | 'single') {
    const elementToExport = this.reportContent.nativeElement;

    html2canvas(elementToExport).then((canvas) => {
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
        position = heightLeft - pageHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      doc.save('branch-performance-report.pdf');
    });
  }

  private exportToExcel(type: 'main' | 'single') {
    let dataToExport: any[] = [];
    let fileName: string = '';

    if (type === 'main') {
      dataToExport = this.reportData.branches.map((item) => {
        return {
          'Branch Name': item.branch.name,
          'Location': item.branch.location,
          'Manager': item.branch.manager,
          'Total Revenue': item.totalRevenue,
          'Revenue Growth (%)': item.revenueGrowthPercent,
          'Product Movement': item.productMovement,
          'Customer Footfall': item.customerFootfall
        };
      });
      fileName = 'branch-performance-summary.xlsx';
    } else if (type === 'single' && this.selectedBranch) {
      dataToExport = [
        { 'Metric': 'Total Revenue', 'Value': this.selectedBranch.totalRevenue },
        { 'Metric': 'Revenue Growth (%)', 'Value': this.selectedBranch.revenueGrowthPercent },
        { 'Metric': 'Product Movement', 'Value': this.selectedBranch.productMovement },
        { 'Metric': 'Customer Footfall', 'Value': this.selectedBranch.customerFootfall },
        // You can add more data from the charts here if needed, in a more complex structure
      ];
      fileName = `${this.selectedBranch.branch.name}-detailed-report.xlsx`;
    } else {
      console.error('No data to export.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BranchReport');
    XLSX.writeFile(workbook, fileName);
  }

  // New method to prepare dropdown data
  prepareDropdownData(): void {
    if (!this.reportData || !this.reportData.branches) {
      return;
    }

    // Prepare data for Total Revenue dropdown
    const revenueData = [...this.reportData.branches]
      .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
      .slice(0, 5) // Get top 5
      .map(branch => ({
        label: branch.branch.name,
        value: this.formatCurrency(branch.totalRevenue)
      }));
    this.dropdownData['totalRevenue'] = revenueData;

    // Prepare data for Average Growth dropdown
    const growthData = [...this.reportData.branches]
      .sort((a, b) => (b.revenueGrowthPercent || 0) - (a.revenueGrowthPercent || 0))
      .slice(0, 5) // Get top 5
      .map(branch => ({
        label: branch.branch.name,
        value: this.formatPercent(branch.revenueGrowthPercent || 0)
      }));
    this.dropdownData['averageGrowth'] = growthData;
  }

  // Toggle dropdown visibility
  toggleDropdown(metric: 'totalRevenue' | 'averageGrowth'): void {
    this.isDropdownOpen[metric] = !this.isDropdownOpen[metric];
    for (const key in this.isDropdownOpen) {
      if (key !== metric) {
        this.isDropdownOpen[key] = false;
      }
    }
  }
}