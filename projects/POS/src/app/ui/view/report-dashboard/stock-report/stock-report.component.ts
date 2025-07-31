import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface InventoryReportRequestDTO {
  branchIds?: number[];
  categoryIds?: number[];
  includeLowStock?: boolean;
}

interface ProductDTO {
  id: number;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
}

interface CategoryDTO {
  id: number;
  name: string;
}

interface BranchDTO {
  id: number;
  name: string;
  location: string;
}

interface InventoryItemDTO {
  product: ProductDTO;
  category: CategoryDTO;
  currentStock: number;
  soldQuantity: number;
  branch: BranchDTO;
  lowStockAlert: boolean;
}

interface InventoryReportDTO {
  inventory: InventoryItemDTO[];
}

@Component({
  selector: 'app-stock-report',
  templateUrl: './stock-report.component.html',
  styleUrl: './stock-report.component.scss'
})
export class StockReportComponent {
  filterForm!: FormGroup;
  reportData!: InventoryReportDTO;
  
  branches: BranchDTO[] = [];
  categories: CategoryDTO[] = [];
  
  totalItems = 0;
  lowStockItems = 0;
  totalValue = 0;
  
  categoriesChartOptions: any;
  stockTrendChartOptions: any;
  branchComparisonChartOptions: any;
  salesVsStockChartOptions: any;
  isFilterFormOpen = false;
  isLoading = false;
  page = 1;
  pageSize = 10;
  sortColumn = 'product.name';
  sortDirection = 'asc';
  
  Math = Math
  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.initFilters();
    this.loadDummyData();
    this.calculateSummaryMetrics();
    this.initCharts();
  }

  initFilters(): void {
    this.filterForm = this.fb.group({
      branchIds: [[]],
      categoryIds: [[]],
      includeLowStock: [false]
    });
  }

  openFilterForm(){
    this.isFilterFormOpen = !this.isFilterFormOpen
  }

  loadDummyData(): void {
    // Dummy branches
    this.branches = [
      { id: 1, name: 'Main Store', location: 'Downtown' },
      { id: 2, name: 'East Branch', location: 'Eastside Mall' },
      { id: 3, name: 'West Branch', location: 'Westfield Shopping Center' },
      { id: 4, name: 'North Branch', location: 'North City Plaza' }
    ];

    // Dummy categories
    this.categories = [
      { id: 1, name: 'Electronics' },
      { id: 2, name: 'Clothing' },
      { id: 3, name: 'Home Goods' },
      { id: 4, name: 'Sporting Equipment' },
      { id: 5, name: 'Office Supplies' }
    ];

    // Generate dummy inventory items
    const inventory: InventoryItemDTO[] = [];
    
    // Generate 50 random inventory items across branches and categories
    for (let i = 1; i <= 50; i++) {
      const branchIndex = Math.floor(Math.random() * this.branches.length);
      const categoryIndex = Math.floor(Math.random() * this.categories.length);
      const currentStock = Math.floor(Math.random() * 100);
      const soldQuantity = Math.floor(Math.random() * 80);
      const lowStockAlert = currentStock < 10;
      
      inventory.push({
        product: {
          id: i,
          name: `Product ${i}`,
          sku: `SKU-${i.toString().padStart(5, '0')}`,
          price: Math.round(10 + Math.random() * 990), // $10 to $1000
          costPrice: Math.round(5 + Math.random() * 500) // $5 to $505
        },
        category: this.categories[categoryIndex],
        currentStock: currentStock,
        soldQuantity: soldQuantity,
        branch: this.branches[branchIndex],
        lowStockAlert: lowStockAlert
      });
    }

    this.reportData = { inventory };
  }

  calculateSummaryMetrics(): void {
    this.totalItems = this.reportData.inventory.reduce((sum, item) => sum + item.currentStock, 0);
    this.lowStockItems = this.reportData.inventory.filter(item => item.lowStockAlert).length;
    this.totalValue = this.reportData.inventory.reduce((sum, item) => sum + (item.currentStock * item.product.price), 0);
  }

  initCharts(): void {
    this.initCategoriesChart();
    this.initStockTrendChart();
    this.initBranchComparisonChart();
    this.initSalesVsStockChart();
  }

  initCategoriesChart(): void {
    // Aggregate data by category
    const categoryData = this.categories.map(category => {
      const items = this.reportData.inventory.filter(item => item.category.id === category.id);
      const totalStock = items.reduce((sum, item) => sum + item.currentStock, 0);
      return { x: category.name, y: totalStock };
    });

    this.categoriesChartOptions = {
      series: [{ data: categoryData }],
      chart: {
        type: 'bar',
        height: 350
      },
      colors: ['#4F46E5'],
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false,
        }
      },
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: this.categories.map(c => c.name),
      },
      title: {
        text: 'Stock by Category',
        align: 'left'
      }
    };
  }

  initStockTrendChart(): void {
    // Create a stock trend line chart (simulated historical data)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    // Generate random trend data for demonstration
    const trendData = months.map((month, index) => {
      return {
        x: month,
        y: Math.floor(1000 + Math.random() * 500 + index * 50) // Increasing trend with randomness
      };
    });

    this.stockTrendChartOptions = {
      series: [{
        name: 'Total Inventory',
        data: trendData
      }],
      chart: {
        height: 350,
        type: 'line',
        toolbar: {
          show: false
        }
      },
      colors: ['#10B981'],
      stroke: {
        width: 3,
        curve: 'smooth'
      },
      xaxis: {
        categories: months
      },
      title: {
        text: 'Inventory Trend (Last 6 Months)',
        align: 'left'
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: "horizontal",
          shadeIntensity: 0.5,
          gradientToColors: ['#3B82F6'],
          opacityFrom: 1,
          opacityTo: 1,
        },
      },
      markers: {
        size: 4,
        colors: ["#FFA41B"],
        strokeColors: "#fff",
        strokeWidth: 2,
        hover: {
          size: 7,
        }
      }
    };
  }

  initBranchComparisonChart(): void {
    // Compare inventory across branches
    const branchLabels = this.branches.map(branch => branch.name);
    const branchData = this.branches.map(branch => {
      return this.reportData.inventory
        .filter(item => item.branch.id === branch.id)
        .reduce((sum, item) => sum + item.currentStock, 0);
    });

    this.branchComparisonChartOptions = {
      series: branchData,
      chart: {
        width: 380,
        type: 'pie',
      },
      labels: branchLabels,
      colors: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'],
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            width: 300
          },
          legend: {
            position: 'bottom'
          }
        }
      }],
      title: {
        text: 'Stock Distribution by Branch',
        align: 'left'
      }
    };
  }

  initSalesVsStockChart(): void {
    // Compare sales vs. current stock for top categories
    const categories = this.categories.slice(0, 5).map(c => c.name);
    
    // Get aggregated data by category
    const stockData: number[] = [];
    const salesData: number[] = [];
    
    this.categories.slice(0, 5).forEach(category => {
      const items = this.reportData.inventory.filter(item => item.category.id === category.id);
      const totalStock = items.reduce((sum, item) => sum + item.currentStock, 0);
      const totalSold = items.reduce((sum, item) => sum + item.soldQuantity, 0);
      
      stockData.push(totalStock);
      salesData.push(totalSold);
    });

    this.salesVsStockChartOptions = {
      series: [{
        name: 'Current Stock',
        data: stockData
      }, {
        name: 'Sold Quantity',
        data: salesData
      }],
      chart: {
        type: 'radar',
        height: 350,
        toolbar: {
          show: false
        }
      },
      dataLabels: {
        enabled: true
      },
      plotOptions: {
        radar: {
          size: 140,
          polygons: {
            strokeColors: '#e9e9e9',
            fill: {
              colors: ['#f8f8f8', '#fff']
            }
          }
        }
      },
      title: {
        text: 'Stock vs Sales by Category',
        align: 'left'
      },
      colors: ['#10B981', '#F59E0B'],
      markers: {
        size: 4,
        colors: ['#10B981', '#F59E0B'],
        strokeWidth: 2,
      },
      tooltip: {
        y: {
          formatter: function(val: any) {
            return val;
          }
        }
      },
      xaxis: {
        categories: categories
      },
      yaxis: {
        tickAmount: 7
      }
    };
  }

  applyFilters(): void {
    this.isLoading = true;
    const filters = this.filterForm.value as InventoryReportRequestDTO;
    console.log('Applying filters:', filters);
    
    // In a real application, this would call a service
    // For the demo, we'll just simulate a delay and filtering
    setTimeout(() => {
      this.isLoading = false;
      // Apply filters to the dummy data
      this.loadDummyData(); // Reload dummy data for demo
      
      // Filter by branch if selected
      if (filters.branchIds && filters.branchIds.length > 0) {
        this.reportData.inventory = this.reportData.inventory.filter(item => 
          filters.branchIds?.includes(item.branch.id)
        );
      }
      
      // Filter by category if selected
      if (filters.categoryIds && filters.categoryIds.length > 0) {
        this.reportData.inventory = this.reportData.inventory.filter(item => 
          filters.categoryIds?.includes(item.category.id)
        );
      }
      
      // Filter by low stock if selected
      if (filters.includeLowStock) {
        this.reportData.inventory = this.reportData.inventory.filter(item => 
          item.lowStockAlert
        );
      }
      
      // Recalculate metrics and rebuild charts
      this.calculateSummaryMetrics();
      this.initCharts();
    }, 800);
  }

  resetFilters(): void {
    this.filterForm.reset({
      branchIds: [],
      categoryIds: [],
      includeLowStock: false
    });
    this.loadDummyData();
    this.calculateSummaryMetrics();
    this.initCharts();
  }

  sortData(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    
    // Sorting logic would be implemented here
    console.log(`Sorting by ${this.sortColumn} in ${this.sortDirection} order`);
  }

  exportToCsv(): void {
    console.log('Exporting to CSV...');
  }

  exportToPdf(): void {
    console.log('Exporting to PDF...');
  }

  printReport(): void {
    console.log('Printing report...');
  }
}
