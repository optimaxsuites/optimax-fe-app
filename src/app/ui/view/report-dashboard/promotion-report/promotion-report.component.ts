import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexXAxis,
  ApexPlotOptions,
  ApexStroke,
  ApexLegend,
  ApexTooltip,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ChartComponent
} from "ng-apexcharts";
import { ReportService } from '../../../service/report.service';
import {
  PromotionsReportRequestDTO,
  PromotionsReportDTO,
  PromotionPerformanceDTO,
  DiscountDTO,
  ProductDTO,
  CategoryDTO
} from '../../../models/interface';

export type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  legend: ApexLegend;
  tooltip: ApexTooltip;
};

export type PieChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  responsive: ApexResponsive[];
  labels: any;
  legend: ApexLegend;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
};

@Component({
  selector: 'app-promotion-report',
  templateUrl: './promotion-report.component.html',
  styleUrls: ['./promotion-report.component.scss']
})
export class PromotionReportComponent implements OnInit {
  @ViewChild("usageChart") usageChart!: ChartComponent;
  @ViewChild("amountChart") amountChart!: ChartComponent;
  @ViewChild("categoryChart") categoryChart!: ChartComponent;
  @ViewChild("timelineChart") timelineChart!: ChartComponent;
  @ViewChild("distributionChart") distributionChart!: ChartComponent;

  public barChartOptions!: BarChartOptions;
  public amountChartOptions!: BarChartOptions;
  public categoryPieOptions!: PieChartOptions;
  public timelineChartOptions!: any;
  public distributionChartOptions!: PieChartOptions;

  reportForm!: FormGroup;
  reportData: PromotionsReportDTO = { promotions: [] };
  selectedPromotion: PromotionPerformanceDTO | null = null;
  loading: boolean = false;
  filterForm = false;

  hasUsageData = false;
  hasAmountData = false;
  hasCategoryData = false;
  hasTimelineData = false;
  hasDistributionData = false;

  totalPromotions = 0;
  totalDiscountAmount = 0;
  totalUsageCount = 0;
  avgDiscountAmount = 0;
  mostUsedPromotion = '';
  mostDiscountedProduct = '';

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService
  ) {
    this.initChartOptions();
  }

  ngOnInit() {
    this.initForm();
  }

  initForm(): void {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const formatDateForInput = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    this.reportForm = this.fb.group({
      startDate: [formatDateForInput(lastMonth)],
      endDate: [formatDateForInput(today)],
      promotionIds: [[]]
    });
  }

  openFilterForm() {
    this.filterForm = !this.filterForm;
  }

  loadData(): void {
    this.loading = true;
    this.resetChartFlags();

    const formValue = this.reportForm.value;

    const startDate = formValue.startDate ? new Date(formValue.startDate) : new Date();
    const endDate = formValue.endDate ? new Date(formValue.endDate) : new Date();

    const payload: PromotionsReportRequestDTO = {
      startDate: startDate,
      endDate: endDate,
      promotionIds: formValue.promotionIds?.length ? formValue.promotionIds : undefined
    };

    console.log('Loading promotion data with payload:', payload);

    this.reportService.getPromotionPerformanceReport(payload).subscribe({
      next: (response: PromotionsReportDTO) => {
        console.log('Received promotion data:', response);
        this.reportData = response;
        this.calculateStats();
        this.updateCharts();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Failed to load promotion data:', error);
        this.reportData = { promotions: [] };
        this.calculateStats();
        this.resetChartFlags();
        this.loading = false;
      }
    });
  }

  resetChartFlags(): void {
    this.hasUsageData = false;
    this.hasAmountData = false;
    this.hasCategoryData = false;
    this.hasTimelineData = false;
    this.hasDistributionData = false;
  }

  calculateStats() {
    if (!this.reportData?.promotions?.length) {
      this.totalPromotions = 0;
      this.totalDiscountAmount = 0;
      this.totalUsageCount = 0;
      this.avgDiscountAmount = 0;
      this.mostUsedPromotion = '';
      this.mostDiscountedProduct = '';
      return;
    }

    this.totalPromotions = this.reportData.promotions.length;
    this.totalDiscountAmount = this.reportData.promotions.reduce((sum: number, promo: PromotionPerformanceDTO) => sum + (promo.totalDiscountAmount || 0), 0);
    this.totalUsageCount = this.reportData.promotions.reduce((sum: number, promo: PromotionPerformanceDTO) => sum + (promo.usageCount || 0), 0);
    this.avgDiscountAmount = this.totalUsageCount > 0 ? this.totalDiscountAmount / this.totalUsageCount : 0;

    if (this.reportData.promotions.length > 0) {
      const mostUsed = this.reportData.promotions.reduce((prev: PromotionPerformanceDTO, current: PromotionPerformanceDTO) =>
        ((prev?.usageCount || 0) > (current?.usageCount || 0)) ? prev : current
      );
      this.mostUsedPromotion = mostUsed?.promotion?.name || '';
    }

    let maxDiscount = 0;
    let maxProduct = '';

    this.reportData.promotions.forEach((promo: PromotionPerformanceDTO) => {
      if (promo.affectedProducts && Array.isArray(promo.affectedProducts)) {
        promo.affectedProducts.forEach((product: ProductDTO) => {
          if ((product.totalDiscountAmount || 0) > maxDiscount) {
            maxDiscount = product.totalDiscountAmount || 0;
            maxProduct = product.name || '';
          }
        });
      }
    });

    this.mostDiscountedProduct = maxProduct;
  }

  initChartOptions() {
    // Usage Chart Options
    this.barChartOptions = {
      series: [{ name: "Usage Count", data: [] }],
      chart: {
        type: "bar",
        height: 350,
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
          borderRadius: 5
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ["transparent"]
      },
      xaxis: {
        categories: []
      },
      legend: {
        position: "top"
      },
      tooltip: {
        y: {
          formatter: function(val: number) {
            return val + " uses";
          }
        }
      }
    };

    // Amount Chart Options
    this.amountChartOptions = {
      series: [{ name: "Discount Amount", data: [] }],
      chart: {
        type: "bar",
        height: 350,
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
          borderRadius: 5
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ["transparent"]
      },
      xaxis: {
        categories: []
      },
      legend: {
        position: "top"
      },
      tooltip: {
        y: {
          formatter: function(val: number) {
            return "₦" + val;
          }
        }
      }
    };

    // Category Pie Chart Options
    this.categoryPieOptions = {
      series: [],
      chart: {
        type: "pie",
        height: 350
      },
      labels: [],
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 300
            },
            legend: {
              position: "bottom"
            }
          }
        }
      ],
      legend: {
        position: "right"
      },
      tooltip: {
        y: {
          formatter: function(val: number) {
            return "₦" + val;
          }
        }
      },
      dataLabels: {
        enabled: true
      }
    };

    // Timeline Chart Options
    this.timelineChartOptions = {
      series: [],
      chart: {
        height: 350,
        type: "rangeBar",
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "50%",
          rangeBarGroupRows: true
        }
      },
      colors: [
        "#00E396",
        "#0090FF",
        "#FF4560",
        "#775DD0",
        "#FEB019",
        "#FA4443",
        "#C8E6C9",
        "#33B2DF"
      ],
      fill: {
        type: "solid"
      },
      xaxis: {
        type: "datetime"
      },
      legend: {
        position: "top"
      },
      tooltip: {
        custom: function(opts: any) {
          const fromDate = new Date(opts.y1).toLocaleDateString();
          const toDate = new Date(opts.y2).toLocaleDateString();
          return (
            '<div class="px-3 py-2">' +
            "<span>" +
            opts.ctx.data.twoDSeriesX[opts.dataPointIndex] +
            ": " +
            fromDate +
            " - " +
            toDate +
            "</span>" +
            "</div>"
          );
        }
      }
    };

    // Distribution Pie Chart
    this.distributionChartOptions = {
      series: [],
      chart: {
        type: "donut",
        height: 350
      },
      labels: [],
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 300
            },
            legend: {
              position: "bottom"
            }
          }
        }
      ],
      legend: {
        position: "right"
      },
      tooltip: {
        y: {
          formatter: function(val: number) {
            return val + " units";
          }
        }
      },
      dataLabels: {
        enabled: true
      }
    };
  }

  updateCharts() {
    this.resetChartFlags();

    if (!this.reportData?.promotions?.length) {
      console.log('No promotion data available for charts');
      return;
    }

    console.log('Updating charts with data:', this.reportData);

    const usageData = this.reportData.promotions.map((p: PromotionPerformanceDTO) => p.usageCount || 0);
    const promoNames = this.reportData.promotions.map((p: PromotionPerformanceDTO) => p.promotion?.name || 'Unknown');

    if (usageData.length > 0 && usageData.some((val: number) => val > 0)) {
      this.barChartOptions = {
        ...this.barChartOptions,
        series: [{ name: "Usage Count", data: usageData }],
        xaxis: { ...this.barChartOptions.xaxis, categories: promoNames }
      };
      this.hasUsageData = true;
    }

    const amountData = this.reportData.promotions.map((p: PromotionPerformanceDTO) => p.totalDiscountAmount || 0);

    if (amountData.length > 0 && amountData.some((val: number) => val > 0)) {
      this.amountChartOptions = {
        ...this.amountChartOptions,
        series: [{ name: "Discount Amount (₦)", data: amountData }],
        xaxis: { ...this.amountChartOptions.xaxis, categories: promoNames }
      };
      this.hasAmountData = true;
    }

    const categoryMap = new Map<string, number>();

    this.reportData.promotions.forEach((promo: PromotionPerformanceDTO) => {
      if (promo.affectedProducts && Array.isArray(promo.affectedProducts)) {
        promo.affectedProducts.forEach((product: ProductDTO) => {
          if (product && product.category) {
            const currentAmount = categoryMap.get(product.category) || 0;
            categoryMap.set(product.category, currentAmount + (product.totalDiscountAmount || 0));
          }
        });
      }
    });

    if (categoryMap.size > 0) {
      const categoryLabels = Array.from(categoryMap.keys());
      const categorySeries = Array.from(categoryMap.values());

      this.categoryPieOptions = {
        ...this.categoryPieOptions,
        labels: categoryLabels,
        series: categorySeries
      };
      this.hasCategoryData = true;
    }

    const timelineSeries = this.reportData.promotions
      .filter((promo: PromotionPerformanceDTO) => promo.startDate && promo.endDate)
      .map((promo: PromotionPerformanceDTO) => {
        return {
          name: promo.promotion?.name || 'Unknown',
          data: [
            {
              x: 'Promotion Timeline',
              y: [
                new Date(promo.startDate).getTime(),
                new Date(promo.endDate).getTime()
              ]
            }
          ]
        };
      });

    if (timelineSeries.length > 0) {
      this.timelineChartOptions = {
        ...this.timelineChartOptions,
        series: timelineSeries
      };
      this.hasTimelineData = true;
    }

    if (this.selectedPromotion) {
      this.updateProductDistributionChart();
    }
  }

  updateProductDistributionChart() {
    if (!this.selectedPromotion?.affectedProducts?.length) {
      this.hasDistributionData = false;
      return;
    }

    const productLabels = this.selectedPromotion.affectedProducts.map((p: ProductDTO) => p.name || 'Unknown');
    const productSeries = this.selectedPromotion.affectedProducts.map((p: ProductDTO) => p.discountedUnits || 0);

    if (productSeries.some((val: number) => val > 0)) {
      this.distributionChartOptions = {
        ...this.distributionChartOptions,
        labels: productLabels,
        series: productSeries
      };
      this.hasDistributionData = true;
    } else {
      this.hasDistributionData = false;
    }
  }

  selectPromotion(promotion: PromotionPerformanceDTO) {
    this.selectedPromotion = promotion;
    this.updateProductDistributionChart();
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
  }

  formatCurrency(amount: number): string {
    if (!amount) return '₦0.00';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  }

  formatPercentage(value: number): string {
    if (!value) return '0%';
    return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(value / 100);
  }

  getDiscountDisplay(promotion: DiscountDTO): string {
    const discountValue = promotion.discountValue ?? 0;
    
    if (!promotion) return '';
    if (promotion.discountType === 'PERCENTAGE') {
      return this.formatPercentage(discountValue);
    } else {
      return this.formatCurrency(discountValue);
    }
  }

  onSubmit() {
    this.loadData();
    this.selectedPromotion = null;
  }
}