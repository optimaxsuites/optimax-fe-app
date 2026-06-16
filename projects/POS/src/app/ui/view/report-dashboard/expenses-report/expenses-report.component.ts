import { Component, OnInit, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexPlotOptions,
  ApexStroke,
  ApexFill,
  ApexTooltip,
  ChartComponent,
  ApexLegend,
  ApexYAxis,
  ApexGrid,
  ApexNonAxisChartSeries,
} from 'ng-apexcharts';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  ProductPerformanceReportDTO,
  CategoryDTO,
  ProductStatsDTO,
  BranchDTO,
  ProductPerformanceReportRequestDTO,
  ProductPerformanceDTO,
  ProductDTO,
} from '../../../models/interface';
import { ReportService } from '../../../service/report.service';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis | ApexYAxis[];
  title?: ApexTitleSubtitle;
  dataLabels?: ApexDataLabels;
  plotOptions?: ApexPlotOptions;
  stroke?: ApexStroke;
  fill?: ApexFill;
  tooltip?: ApexTooltip;
  legend?: ApexLegend;
  colors?: string[];
  grid?: ApexGrid;
  labels?: string[];
};

type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  dataLabels?: ApexDataLabels;
  plotOptions?: ApexPlotOptions;
  colors?: string[];
  legend?: ApexLegend;
  tooltip?: ApexTooltip;
  fill?: ApexFill;
  stroke?: ApexStroke;
  responsive?: any[];
};

interface MappedBreakdownStats {
  name: string;
  revenue: number;
  avgMargin: number;
}

interface DropdownData {
  label: string;
  value: any;
}

@Component({
  selector: 'app-expenses-report',
  templateUrl: './expenses-report.component.html',
  styleUrls: ['./expenses-report.component.scss'],
})
export class ExpensesReportComponent implements OnInit, AfterViewInit {
  @ViewChild('revenueChart') revenueChart!: ChartComponent;
  @ViewChild('productSalesChart') productSalesChart!: ChartComponent;
  @ViewChild('categoryPerformanceChart') categoryPerformanceChart!: ChartComponent;
  @ViewChild('reportContent') reportContent!: ElementRef;

  isExportDropdownOpen = false;
  reportForm!: FormGroup;
  isLoading = false;
  report: ProductPerformanceReportDTO | null = null;
  branches: BranchDTO[] = [];
  categories: CategoryDTO[] = [];
  filterForm = false;
  productPage = 1;
  productItemsPerPage = 10;
  Math = Math;

  // New state variables for dropdowns and tooltips
  isDropdownOpen: { [key: string]: boolean } = {
    totalProductsSold: false,
    totalRevenue: false
  };
  dropdownData: { [key: string]: DropdownData[] } = {
    totalProductsSold: [],
    totalRevenue: []
  };
  hoveringInfo: { [key: string]: boolean } = {
    avgOrderValue: false,
    avgGrossMargin: false
  };

  public revenueChartOptions: ChartOptions = {
    series: [],
    chart: {
      type: 'bar',
      height: 400,
      toolbar: { show: true },
      animations: {
        enabled: true,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '70%',
        borderRadius: 6,
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent'],
    },
    xaxis: { categories: [] },
    yaxis: {
      title: { text: 'Amount (₦)' },
    },
    fill: { opacity: 1 },
    tooltip: {
      y: {
        formatter: (val: number, { seriesIndex }: any) => {
          return seriesIndex === 0
            ? this.formatCurrency(val)
            : this.formatPercent(val);
        },
      },
    },
    legend: { position: 'top' },
    colors: ['#3B82F6', '#10B981'],
  };

  public productSalesChartOptions: DonutChartOptions = {
    series: [],
    chart: {
      type: 'donut',
      height: 400,
      toolbar: { show: true },
    },
    labels: [],
    dataLabels: {
      enabled: true,
      formatter: (val: number, opts: any) => {
        return `${opts.w.config.labels[opts.seriesIndex]}: ${this.formatNumber(
          opts.w.config.series[opts.seriesIndex]
        )}`;
      },
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Units',
              formatter: () =>
                this.formatNumber(this.report?.totalProductsSold),
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => {
          const total = this.report?.totalProductsSold || 0;
          const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
          return `${this.formatNumber(val)} units (${percentage}%)`;
        },
      },
    },
    legend: {
      position: 'bottom',
      formatter: (seriesName: string, opts: any) => {
        return `${seriesName}: ${this.formatNumber(
          opts.w.config.series[opts.seriesIndex]
        )}`;
      },
    },
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
  };

  public categoryPerformanceChartOptions: ChartOptions = {
    series: [],
    chart: {
      height: 400,
      type: 'line',
      stacked: false,
      toolbar: { show: true },
      animations: {
        enabled: true,
      },
    },
    stroke: {
      width: [0, 3],
      curve: 'smooth',
      dashArray: [0, 3],
    },
    plotOptions: { bar: { columnWidth: '50%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: [] },
    yaxis: [
      {
        seriesName: 'Revenue',
        title: {
          text: 'Amount (₦)',
          style: {
            fontSize: '14px',
            fontWeight: '500',
            color: '#6B7280',
          },
        },
        labels: {
          formatter: (value: number) => {
            return this.formatCurrency(value);
          },
        },
      },
      {
        seriesName: 'Margin',
        opposite: true,
        title: {
          text: 'Margin (%)',
          style: {
            fontSize: '14px',
            fontWeight: '500',
            color: '#F59E0B',
          },
        },
        min: 0,
        max: 100,
        labels: {
          formatter: (value: number) => {
            return this.formatPercent(value);
          },
        },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (y: number, { seriesIndex }: any) => {
          return seriesIndex === 0
            ? this.formatCurrency(y)
            : this.formatPercent(y);
        },
      },
    },
    colors: ['#3B82F6', '#F59E0B'],
    legend: {
      position: 'top',
    },
  };

  groupByOptions = [
    { value: 'product', label: 'Product' },
    { value: 'category', label: 'Category' },
    { value: 'variant', label: 'Variant' },
  ];

  constructor(private fb: FormBuilder, private reportService: ReportService) {}

  ngOnInit(): void {
    this.initForm();
    this.loadInitialData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeEmptyCharts();
    }, 100);
  }

  initForm(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.reportForm = this.fb.group({
      startDate: [thirtyDaysAgo.toISOString().split('T')[0]],
      endDate: [today.toISOString().split('T')[0]],
      branchIds: [[]],
      categoryIds: [[]],
      groupBy: ['product'],
    });
  }

  loadInitialData(): void {
    this.isLoading = true;

    this.reportService.getBranches().subscribe({
      next: (branches) => {
        this.branches = branches || [];
        this.loadCategories();
      },
      error: (err) => {
        console.error('Error loading branches:', err);
        this.branches = [];
        this.loadCategories();
      },
    });
  }

  loadCategories(): void {
    this.reportService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories || [];
        this.generateReport();
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.categories = [];
        this.generateReport();
      },
    });
  }

  initializeEmptyCharts(): void {
    this.revenueChartOptions = {
      ...this.revenueChartOptions,
      series: [
        { name: 'Revenue (₦)', data: [] },
        { name: 'Gross Margin (%)', data: [] },
      ],
      xaxis: { categories: [] },
    };

    this.productSalesChartOptions = {
      ...this.productSalesChartOptions,
      series: [],
      labels: [],
    };

    this.categoryPerformanceChartOptions = {
      ...this.categoryPerformanceChartOptions,
      series: [
        { name: 'Revenue (₦)', type: 'column', data: [] },
        { name: 'Avg. Gross Margin (%)', type: 'line', data: [] },
      ],
      xaxis: { categories: [] },
    };

    this.updateChartComponents();
  }

  generateReport(): void {
    this.isLoading = true;

    const formValue = this.reportForm.value;
    const payload: ProductPerformanceReportRequestDTO = {
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      branchIds: Array.isArray(formValue.branchIds) ? formValue.branchIds : [],
      categoryIds: Array.isArray(formValue.categoryIds)
        ? formValue.categoryIds
        : [],
      groupBy: formValue.groupBy,
    };

    console.log('Sending payload to API:', payload);

    this.reportService.getProductPerformanceReport(payload).subscribe({
      next: (data) => {
        console.log('API response data:', data);
        console.log('Raw Breakdown Data:', data.productPerformanceBreakdown);
        this.report = data;
        if (data && (data.productPerformanceBreakdown || data.bestsellers)) {
          this.safeUpdateCharts();
          this.prepareDropdownData();
        } else {
          console.warn('No data received from API');
          this.initializeEmptyCharts();
          this.dropdownData = { totalProductsSold: [], totalRevenue: [] };
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading report:', err);
        this.isLoading = false;
        this.initializeEmptyCharts();
        this.dropdownData = { totalProductsSold: [], totalRevenue: [] };
      },
    });
  }

  safeUpdateCharts(): void {
    try {
      this.updateCharts();
    } catch (e) {
      console.error('Error updating charts:', e);
      this.initializeEmptyCharts();
    }
  }

  updateCharts(): void {
    if (!this.report) {
      console.log('No report data available');
      this.initializeEmptyCharts();
      return;
    }

    console.log('Updating charts with report data:', this.report);

    const breakdown = this.normalizeBreakdown(
      this.report.productPerformanceBreakdown || []
    );
    console.log('Normalized breakdown:', breakdown);

    // Revenue Chart - Top Products
    const topProducts = [...breakdown]
      .filter((p: ProductPerformanceDTO) => this.isProductPerformanceDTO(p))
      .sort(
        (a: ProductPerformanceDTO, b: ProductPerformanceDTO) =>
          this.getSafeNumber(b?.totalRevenue) -
          this.getSafeNumber(a?.totalRevenue)
      )
      .slice(0, 10);

    console.log('Top products for revenue chart:', topProducts);

    if (topProducts.length > 0) {
      this.revenueChartOptions = {
        ...this.revenueChartOptions,
        series: [
          {
            name: 'Revenue (₦)',
            data: topProducts.map((p) => this.getSafeNumber(p?.totalRevenue)),
          },
          {
            name: 'Gross Margin (%)',
            data: topProducts.map(
              (p) => this.getSafeNumber(p?.grossMargin) * 100
            ),
          },
        ],
        xaxis: {
          categories: topProducts.map(
            (p) => p?.product?.name || 'Unnamed Product'
          ),
        },
      };
    } else {
      this.revenueChartOptions = {
        ...this.revenueChartOptions,
        series: [
          { name: 'Revenue (₦)', data: [] },
          { name: 'Gross Margin (%)', data: [] },
        ],
        xaxis: { categories: [] },
      };
    }

    // Product Sales Chart - Bestsellers
    const validBestsellers = (this.report.bestsellers || [])
      .filter(
        (p: ProductStatsDTO) => p?.product?.name && p?.quantitySold != null && p.quantitySold > 0
      )
      .slice(0, 5);

    console.log('Valid bestsellers:', validBestsellers);

    if (validBestsellers.length > 0) {
      this.productSalesChartOptions = {
        ...this.productSalesChartOptions,
        series: validBestsellers.map((p: ProductStatsDTO) => this.getSafeNumber(p.quantitySold)),
        labels: validBestsellers.map((p: ProductStatsDTO) => p.product.name),
      };
    } else {
      this.productSalesChartOptions = {
        ...this.productSalesChartOptions,
        series: [],
        labels: [],
      };
    }

    // Category Performance Chart
    this.updateCategoryPerformanceChart(breakdown);

    // Update all chart components
    this.updateChartComponents();
  }

  private updateCategoryPerformanceChart(
    breakdown: ProductPerformanceDTO[]
  ): void {
    const groupBy = this.reportForm.get('groupBy')?.value;
    let chartData: MappedBreakdownStats[] = [];

    if (groupBy === 'category') {
      chartData = breakdown.map((c: ProductPerformanceDTO) => ({
        name: c.category?.name || 'Unknown Category',
        revenue: this.getSafeNumber(c.totalRevenue),
        avgMargin: this.getSafeNumber(c.grossMargin) * 100,
      }));
    } else if (groupBy === 'variant') {
      const variantData = breakdown.reduce((acc, curr: ProductPerformanceDTO) => {
        if (!curr?.variant) return acc;

        const variantName = curr.variant;
        if (!acc[variantName]) {
          acc[variantName] = {
            name: variantName,
            revenue: 0,
            marginSum: 0,
            count: 0,
          };
        }
        acc[variantName].revenue += this.getSafeNumber(curr.totalRevenue);
        acc[variantName].marginSum += this.getSafeNumber(curr.grossMargin);
        acc[variantName].count++;
        return acc;
      }, {} as Record<string, { name: string; revenue: number; marginSum: number; count: number }>);

      chartData = Object.values(variantData).map((v: { name: string; revenue: number; marginSum: number; count: number }) => ({
        name: v.name,
        revenue: v.revenue,
        avgMargin: v.count > 0 ? (v.marginSum / v.count) * 100 : 0,
      }));
    } else {
      const categoryData = breakdown.reduce((acc, curr: ProductPerformanceDTO) => {
        if (!curr?.category?.id || !curr?.category?.name) return acc;
        const categoryId = curr.category.id;
        const categoryName = curr.category.name;

        if (!acc[categoryId]) {
          acc[categoryId] = {
            name: categoryName,
            revenue: 0,
            marginSum: 0,
            count: 0,
          };
        }
        acc[categoryId].revenue += this.getSafeNumber(curr.totalRevenue);
        acc[categoryId].marginSum += this.getSafeNumber(curr.grossMargin);
        acc[categoryId].count++;
        return acc;
      }, {} as Record<string, { name: string; revenue: number; marginSum: number; count: number }>);

      chartData = Object.values(categoryData)
        .filter((c) => c !== undefined && c !== null)
        .map((c: { name: string; revenue: number; marginSum: number; count: number }) => ({
          name: c.name || 'Unknown Category',
          revenue: c.revenue || 0,
          avgMargin: c.count > 0 ? (c.marginSum / c.count) * 100 : 0,
        }));
    }

    if (chartData.length > 0) {
      this.categoryPerformanceChartOptions = {
        ...this.categoryPerformanceChartOptions,
        series: [
          {
            name: 'Revenue (₦)',
            type: 'column',
            data: chartData.map((d) => d.revenue),
          },
          {
            name: 'Avg. Gross Margin (%)',
            type: 'line',
            data: chartData.map((d) => d.avgMargin),
          },
        ],
        xaxis: {
          categories: chartData.map((d) => d.name),
        },
      };
    } else {
      this.categoryPerformanceChartOptions = {
        ...this.categoryPerformanceChartOptions,
        series: [
          { name: 'Revenue (₦)', type: 'column', data: [] },
          { name: 'Avg. Gross Margin (%)', type: 'line', data: [] },
        ],
        xaxis: { categories: [] },
      };
    }
  }

  updateChartComponents(): void {
    setTimeout(() => {
      try {
        if (this.revenueChart?.updateOptions) {
          this.revenueChart.updateOptions(this.revenueChartOptions, true);
        }
        if (this.productSalesChart?.updateOptions) {
          this.productSalesChart.updateOptions(
            {
              series: this.productSalesChartOptions.series,
              labels: this.productSalesChartOptions.labels,
            },
            true
          );
        }
        if (this.categoryPerformanceChart?.updateOptions) {
          this.categoryPerformanceChart.updateOptions(
            this.categoryPerformanceChartOptions,
            true
          );
        }
      } catch (e) {
        console.error('Error updating chart components:', e);
      }
    }, 500);
  }

  normalizeBreakdown(breakdown: any): ProductPerformanceDTO[] {
    if (Array.isArray(breakdown)) {
      return breakdown.filter((item: any) => this.isProductPerformanceDTO(item));
    }
    if (this.isProductPerformanceDTO(breakdown)) {
      return [breakdown];
    }
    if (breakdown && typeof breakdown === 'object') {
      return Object.values(breakdown).filter((item: any) =>
        this.isProductPerformanceDTO(item)
      ) as ProductPerformanceDTO[];
    }
    return [];
  }

  private isProductPerformanceDTO(item: any): item is ProductPerformanceDTO {
    const isProductBreakdown =
      item &&
      typeof item === 'object' &&
      'totalRevenue' in item &&
      'grossMargin' in item &&
      item.product &&
      'name' in item.product;

    const isAggregatedBreakdown =
      item &&
      typeof item === 'object' &&
      'totalRevenue' in item &&
      'grossMargin' in item &&
      ('category' in item || 'variant' in item);

    return isProductBreakdown || isAggregatedBreakdown;
  }

  getSafeNumber(value?: number | null, defaultValue: number = 0): number {
    return value !== null && value !== undefined && !isNaN(value)
      ? value
      : defaultValue;
  }

  formatCurrency(value?: number | null): string {
    const numValue = this.getSafeNumber(value);
    return (
      '₦' +
      numValue.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  formatPercent(value?: number | null): string {
    const numValue = this.getSafeNumber(value);
    return (numValue * 100).toFixed(1) + '%';
  }

  formatNumber(value?: number | null): string {
    const numValue = this.getSafeNumber(value);
    return numValue.toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  get paginatedProductBreakdown() {
    const breakdown = this.normalizeBreakdown(
      this.report?.productPerformanceBreakdown
    );
    return breakdown.slice(this.pageStart, this.pageEnd);
  }

  get pageStart(): number {
    return (this.productPage - 1) * this.productItemsPerPage;
  }

  get pageEnd(): number {
    return this.pageStart + this.productItemsPerPage;
  }

  get productTotalPages() {
    const breakdown = this.normalizeBreakdown(
      this.report?.productPerformanceBreakdown
    );
    return Math.ceil((breakdown.length || 0) / this.productItemsPerPage);
  }

  setProductPage(page: number) {
    if (page >= 1 && page <= this.productTotalPages) {
      this.productPage = page;
    }
  }

  get averageGrossMargin(): number {
    const breakdown = this.normalizeBreakdown(
      this.report?.productPerformanceBreakdown
    );
    if (!breakdown.length) return 0;

    const total = breakdown.reduce((sum, item) => {
      return sum + this.getSafeNumber(item?.grossMargin);
    }, 0);

    return total / breakdown.length;
  }

  openFilterForm() {
    this.filterForm = !this.filterForm;
  }

  onSubmit(): void {
    this.generateReport();
  }

  // New export methods
  toggleExportDropdown(): void {
    this.isExportDropdownOpen = !this.isExportDropdownOpen;
  }

  exportReport(format: 'pdf' | 'excel') {
    this.isExportDropdownOpen = false;
    if (!this.reportContent || !this.reportContent.nativeElement) {
      console.error('Report content element not found for export.');
      alert(
        'Could not find report content. Please ensure it has the correct template reference variable (#reportContent).'
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
        position = heightLeft - pageHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      doc.save('product-performance-report.pdf');
    });
  }

  private exportToExcel() {
    const dataToExport = this.normalizeBreakdown(
      this.report?.productPerformanceBreakdown || []
    ).map((item) => {
      return {
        'Product': item.product?.name || 'N/A',
        'Category': item.category?.name || 'N/A',
        'Variant': item.variant || 'Standard',
        'Branch': item.branch?.name || 'All Branches',
        'Price (₦)': this.getSafeNumber(item.product?.price || 0),
        'Quantity Sold': this.getSafeNumber(item.quantitySold || 0),
        'Revenue (₦)': this.getSafeNumber(item.totalRevenue || 0),
        'Gross Margin (%)': this.getSafeNumber(item.grossMargin || 0) * 100,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ProductPerformance');
    XLSX.writeFile(workbook, 'product-performance-report.xlsx');
  }

  // New method to prepare dropdown data
  prepareDropdownData(): void {
    if (!this.report) {
      return;
    }

    // Prepare data for Total Products Sold dropdown
    const bestsellers = this.report.bestsellers || [];
    this.dropdownData['totalProductsSold'] = bestsellers.map(item => ({
      label: item.product?.name || 'N/A',
      value: this.formatNumber(item.quantitySold) + ' units'
    })).slice(0, 5); // Show top 5

    // Prepare data for Total Revenue dropdown
    const breakdown = this.normalizeBreakdown(this.report.productPerformanceBreakdown || []);
    const revenueMap = breakdown.reduce((acc, curr) => {
      const productName = curr.product?.name || 'N/A';
      acc[productName] = (acc[productName] || 0) + this.getSafeNumber(curr.totalRevenue);
      return acc;
    }, {} as { [key: string]: number });

    const sortedRevenue = Object.entries(revenueMap)
      .sort(([, a], [, b]) => b - a)
      .map(([name, revenue]) => ({
        label: name,
        value: this.formatCurrency(revenue)
      })).slice(0, 5); // Show top 5

    this.dropdownData['totalRevenue'] = sortedRevenue;
  }

  toggleDropdown(metric: 'totalProductsSold' | 'totalRevenue'): void {
    this.isDropdownOpen[metric] = !this.isDropdownOpen[metric];
    // Close other dropdowns
    for (const key in this.isDropdownOpen) {
      if (key !== metric) {
        this.isDropdownOpen[key] = false;
      }
    }
  }
}