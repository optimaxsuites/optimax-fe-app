import { Component, ViewChild } from '@angular/core';
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

export interface PromotionsReportRequestDTO {
startDate: Date;
endDate: Date;
promotionIds?: string[];
}

export interface PromotionsReportDTO {
promotions: PromotionPerformanceDTO[];
}

export interface PromotionPerformanceDTO {
promotion: DiscountDTO;
usageCount: number;
totalDiscountAmount: number;
affectedProducts: ProductDTO[];
startDate: Date;
endDate: Date;
}

export interface DiscountDTO {
id: string;
name: string;
description: string;
discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
discountValue: number;
active: boolean;
code?: string;
}

export interface ProductDTO {
id: string;
name: string;
category: string;
price: number;
discountedUnits: number;
totalDiscountAmount: number;
} 

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
  styleUrl: './promotion-report.component.scss'
})
export class PromotionReportComponent {
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
  reportData!: PromotionsReportDTO;
  selectedPromotion: PromotionPerformanceDTO | null = null;
  
  // Stats
  totalPromotions = 0;
  totalDiscountAmount = 0;
  totalUsageCount = 0;
  avgDiscountAmount = 0;
  mostUsedPromotion = '';
  mostDiscountedProduct = '';
  filterForm = false
  
  constructor(private fb: FormBuilder) {
    this.initChartOptions();
  }

  ngOnInit() {
    this.reportForm = this.fb.group({
      startDate: [new Date(2025, 3, 1)], // April 1, 2025
      endDate: [new Date(2025, 4, 4)],   // May 4, 2025
      promotionIds: [[]]
    });
    
    // Generate dummy data
    this.reportData = this.generateDummyData();
    
    // Calculate stats
    this.calculateStats();
    
    // Update charts
    this.updateCharts();
  }

  openFilterForm(){
    this.filterForm = !this.filterForm
  }
  generateDummyData(): PromotionsReportDTO {
    const discountTypes: Array<'PERCENTAGE' | 'FIXED_AMOUNT'> = ['PERCENTAGE', 'FIXED_AMOUNT'];
    const categories = ['Electronics', 'Clothing', 'Home & Kitchen', 'Beauty', 'Sports', 'Books'];
    
    const promotions: PromotionPerformanceDTO[] = [];
    
    // Generate 8 promotions
    for (let i = 1; i <= 8; i++) {
      const discountType = discountTypes[Math.floor(Math.random() * 2)];
      const discountValue = discountType === 'PERCENTAGE' ? 
        Math.floor(Math.random() * 50) + 5 : // 5-55%
        Math.floor(Math.random() * 100) + 10; // $10-$110
      
      const usageCount = Math.floor(Math.random() * 500) + 50;
      const totalDiscountAmount = Math.floor(Math.random() * 10000) + 1000;
      
      // Generate 3-8 affected products for each promotion
      const productsCount = Math.floor(Math.random() * 6) + 3;
      const affectedProducts: ProductDTO[] = [];
      
      for (let j = 1; j <= productsCount; j++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const price = Math.floor(Math.random() * 500) + 20;
        const discountedUnits = Math.floor(Math.random() * 100) + 5;
        const productDiscountAmount = Math.floor(Math.random() * 2000) + 100;
        
        affectedProducts.push({
          id: `prod-${i}-${j}`,
          name: `Product ${j} (Promo ${i})`,
          category,
          price,
          discountedUnits,
          totalDiscountAmount: productDiscountAmount
        });
      }
      
      // Calculate dates within the range
      const startDateOffset = Math.floor(Math.random() * 15);
      const durationDays = Math.floor(Math.random() * 15) + 5;
      
      const startDate = new Date(2025, 3, 1 + startDateOffset);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + durationDays);
      
      promotions.push({
        promotion: {
          id: `promo-${i}`,
          name: `Spring Sale ${i}`,
          description: `Special discount for Spring Season ${i}`,
          discountType,
          discountValue,
          active: Math.random() > 0.3,
          code: `SPRING${i}${Math.floor(Math.random() * 100)}`
        },
        usageCount,
        totalDiscountAmount,
        affectedProducts,
        startDate,
        endDate
      });
    }
    
    return { promotions };
  }
  
  calculateStats() {
    if (!this.reportData?.promotions?.length) return;
    
    this.totalPromotions = this.reportData.promotions.length;
    this.totalDiscountAmount = this.reportData.promotions.reduce((sum, promo) => sum + promo.totalDiscountAmount, 0);
    this.totalUsageCount = this.reportData.promotions.reduce((sum, promo) => sum + promo.usageCount, 0);
    this.avgDiscountAmount = this.totalDiscountAmount / this.totalUsageCount;
    
    // Find most used promotion
    const mostUsed = this.reportData.promotions.reduce((prev, current) => 
      prev.usageCount > current.usageCount ? prev : current
    );
    this.mostUsedPromotion = mostUsed.promotion.name;
    
    // Find most discounted product
    let maxDiscount = 0;
    let maxProduct = '';
    
    this.reportData.promotions.forEach(promo => {
      promo.affectedProducts.forEach(product => {
        if (product.totalDiscountAmount > maxDiscount) {
          maxDiscount = product.totalDiscountAmount;
          maxProduct = product.name;
        }
      });
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
          formatter: function(val) {
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
          formatter: function(val) {
            return "$" + val;
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
          formatter: function(val) {
            return "$" + val;
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
        custom: function(opts: { y1: string | number | Date; y2: string | number | Date; ctx: { data: { twoDSeriesX: { [x: string]: string; }; }; }; dataPointIndex: string | number; }) {
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
          formatter: function(val) {
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
    if (!this.reportData?.promotions?.length) return;
    
    // Update usage chart
    const usageData = this.reportData.promotions.map(p => p.usageCount);
    const promoNames = this.reportData.promotions.map(p => p.promotion.name);
    
    this.barChartOptions.series = [{ name: "Usage Count", data: usageData }];
    this.barChartOptions.xaxis = { categories: promoNames };
    
    // Update amount chart
    const amountData = this.reportData.promotions.map(p => p.totalDiscountAmount);
    
    this.amountChartOptions.series = [{ name: "Discount Amount ($)", data: amountData }];
    this.amountChartOptions.xaxis = { categories: promoNames };
    
    // Update category chart
    const categoryMap = new Map<string, number>();
    
    this.reportData.promotions.forEach(promo => {
      promo.affectedProducts.forEach(product => {
        const currentAmount = categoryMap.get(product.category) || 0;
        categoryMap.set(product.category, currentAmount + product.totalDiscountAmount);
      });
    });
    
    const categoryLabels = Array.from(categoryMap.keys());
    const categorySeries = Array.from(categoryMap.values());
    
    this.categoryPieOptions.labels = categoryLabels;
    this.categoryPieOptions.series = categorySeries;
    
    // Update timeline chart
    const timelineSeries = this.reportData.promotions.map(promo => {
      return {
        name: promo.promotion.name,
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
    
    this.timelineChartOptions.series = timelineSeries;
    
    // Update product distribution chart if a promotion is selected
    if (this.selectedPromotion) {
      this.updateProductDistributionChart();
    }
  }
  
  updateProductDistributionChart() {
    if (!this.selectedPromotion) return;
    
    const productLabels = this.selectedPromotion.affectedProducts.map(p => p.name);
    const productSeries = this.selectedPromotion.affectedProducts.map(p => p.discountedUnits);
    
    this.distributionChartOptions.labels = productLabels;
    this.distributionChartOptions.series = productSeries;
  }
  
  selectPromotion(promotion: PromotionPerformanceDTO) {
    this.selectedPromotion = promotion;
    this.updateProductDistributionChart();
  }
  
  formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString();
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  }
  
  formatPercentage(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(value / 100);
  }
  
  getDiscountDisplay(promotion: DiscountDTO): string {
    if (promotion.discountType === 'PERCENTAGE') {
      return this.formatPercentage(promotion.discountValue);
    } else {
      return this.formatCurrency(promotion.discountValue);
    }
  }
  
  onSubmit() {
    // In a real app, this would call a service to get the data
    console.log('Form submitted:', this.reportForm.value);
    // For demo purposes, just regenerate data
    this.reportData = this.generateDummyData();
    this.calculateStats();
    this.updateCharts();
    this.selectedPromotion = null;
  }

}
