import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';


@Component({
  selector: 'app-sale-summaries',
  templateUrl: './sale-summaries.component.html',
  styleUrls: ['./sale-summaries.component.scss'],
})
export class SaleSummariesComponent implements OnInit {
  totalSales: number = 0;
  grossProfit: number = 0;
  totalGoodsSold: number = 0;
  profitMargin: number = 0;
  totalTransactions: number = 0;

  // Period comparison
  comparisonData = {
    sales: { current: 0, previous: 0, percentChange: 0 },
    profit: { current: 0, previous: 0, percentChange: 0 },
    goods: { current: 0, previous: 0, percentChange: 0 },
    transactions: { current: 0, previous: 0, percentChange: 0 },
  };

  // For filtering
  filterForm: FormGroup;
  periods: any[] = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'week' },
    { label: 'Last Month', value: 'lastMonth' },
  ];

  // Cashier list
  cashiers: any[] = [
    { id: 1, name: 'Ben' },
    { id: 2, name: 'Winifred' },
    { id: 3, name: 'Conrad' },
  ];
  selectedCashier: any = null;

  // For charts
  salesTrendData: any;
  categoryPerformanceData: any;
  hourlyDistributionData: any;

  topCategories: any[] = [];
  topProducts: any[] = [];
  Math: any = Math;
  categoryChartOptions: any;

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      period: ['today'],
      cashier: [null],
    });
  }

  ngOnInit(): void {
    this.Math = Math;
    this.loadSalesData();

    // Subscribe to form changes
    this.filterForm.valueChanges.subscribe(() => {
      this.loadSalesData();
    });

    this.categoryChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            padding: 15,
          },
        },
      },
      cutout: '60%',
    };
  }

  onCashierChange(selectedCashier: any): void {
    this.selectedCashier = selectedCashier ? selectedCashier.id : null;
    this.loadSalesData();
  }

  loadSalesData(): void {
    const period = this.filterForm.get('period')?.value || 'today';
    this.fetchMockData(period);
    this.initializeCharts();
  }

  fetchMockData(period: string): void {
    const salesMultiplier = this.getPeriodMultiplier(period);

    // Mock data for each cashier
    const cashierSalesData: Record<
      number,
      { sales: number; profit: number; goods: number; transactions: number }
    > = {
      1: { sales: 1000, profit: 300, goods: 30, transactions: 15 },
      2: { sales: 1500, profit: 450, goods: 45, transactions: 20 },
      3: { sales: 2000, profit: 600, goods: 60, transactions: 25 },
    };

    // Set summary metrics based on cashier selection
    if (this.selectedCashier) {
      // Use the selected cashier's data
      const cashierData = cashierSalesData[this.selectedCashier];
      this.totalSales = cashierData.sales * salesMultiplier;
      this.grossProfit = cashierData.profit * salesMultiplier;
      this.totalGoodsSold = cashierData.goods * salesMultiplier;
      this.totalTransactions = cashierData.transactions * salesMultiplier;
    } else {
      // Sum all cashiers' data to show total when none is selected
      const totalData = Object.values(cashierSalesData).reduce(
        (acc, curr) => {
          return {
            sales: acc.sales + curr.sales,
            profit: acc.profit + curr.profit,
            goods: acc.goods + curr.goods,
            transactions: acc.transactions + curr.transactions,
          };
        },
        { sales: 0, profit: 0, goods: 0, transactions: 0 }
      );

      this.totalSales = totalData.sales * salesMultiplier;
      this.grossProfit = totalData.profit * salesMultiplier;
      this.totalGoodsSold = totalData.goods * salesMultiplier;
      this.totalTransactions = totalData.transactions * salesMultiplier;
    }

    this.profitMargin = (this.grossProfit / this.totalSales) * 100;

    // Set comparison data
    const prevMultiplier = period === 'today' ? 0.9 : 0.8;
    this.comparisonData = {
      sales: {
        current: this.totalSales,
        previous: this.totalSales * prevMultiplier,
        percentChange: (1 - prevMultiplier) * 100,
      },
      profit: {
        current: this.grossProfit,
        previous: this.grossProfit * prevMultiplier,
        percentChange: (1 - prevMultiplier) * 100,
      },
      goods: {
        current: this.totalGoodsSold,
        previous: this.totalGoodsSold * prevMultiplier,
        percentChange: (1 - prevMultiplier) * 100,
      },
      transactions: {
        current: this.totalTransactions,
        previous: this.totalTransactions * prevMultiplier,
        percentChange: (1 - prevMultiplier) * 100,
      },
    };

    // Set top categories and products
    this.topCategories = [
      {
        name: 'Electronics',
        sales: this.totalSales * 0.35,
        profit: this.grossProfit * 0.4,
        items: this.totalGoodsSold * 0.25,
      },
      {
        name: 'Accessories',
        sales: this.totalSales * 0.25,
        profit: this.grossProfit * 0.3,
        items: this.totalGoodsSold * 0.35,
      },
      {
        name: 'Food & Beverage',
        sales: this.totalSales * 0.2,
        profit: this.grossProfit * 0.15,
        items: this.totalGoodsSold * 0.25,
      },
    ];

    this.topProducts = [
      {
        name: 'Smartphone Case',
        category: 'Accessories',
        sales: this.totalSales * 0.15,
        profit: this.grossProfit * 0.2,
        quantity: this.totalGoodsSold * 0.18,
      },
      {
        name: 'USB Charger',
        category: 'Electronics',
        sales: this.totalSales * 0.12,
        profit: this.grossProfit * 0.15,
        quantity: this.totalGoodsSold * 0.14,
      },
      {
        name: 'Coffee',
        category: 'Food & Beverage',
        sales: this.totalSales * 0.1,
        profit: this.grossProfit * 0.08,
        quantity: this.totalGoodsSold * 0.22,
      },
    ];
  }

  getPeriodMultiplier(period: string): number {
    switch (period) {
      case 'today':
        return 1;
      case 'yesterday':
        return 1.1;
      case 'week':
        return 6.5;
      case 'lastMonth':
        return 24;
      default:
        return 1;
    }
  }

  initializeCharts(): void {
    // Sales Trend Chart
    this.salesTrendData = {
      labels: this.generatePeriodLabels(),
      datasets: [
        {
          label: 'Sales',
          data: this.generateTrendData(this.totalSales / 8, 8, 15),
          borderColor: '#4361EE',
          backgroundColor: 'rgba(67, 97, 238, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Profit',
          data: this.generateTrendData(this.grossProfit / 8, 8, 15),
          borderColor: '#3DAF57',
          backgroundColor: 'rgba(61, 175, 87, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
        },
      ],
    };

    // Category Breakdown Chart
    this.categoryPerformanceData = {
      labels: this.topCategories.map((cat) => cat.name),
      datasets: [
        {
          label: 'Sales',
          data: this.topCategories.map((cat) => cat.sales),
          backgroundColor: ['#4361EE', '#FF6B6B', '#FFD166'],
        },
      ],
    };

    // Hourly Distribution Chart
    this.hourlyDistributionData = {
      labels: [
        '9 AM',
        '10 AM',
        '11 AM',
        '12 PM',
        '1 PM',
        '2 PM',
        '3 PM',
        '4 PM',
      ],
      datasets: [
        {
          label: 'Sales by Hour',
          data: this.generateHourlyDistribution(),
          backgroundColor: 'rgba(67, 97, 238, 0.6)',
          borderColor: '#4361EE',
          borderWidth: 1,
        },
      ],
    };
  }

  getSelectedCashierName(): string {
    if (this.selectedCashier) {
      const found = this.cashiers.find((c) => c.id === this.selectedCashier);
      return found ? found.name : '';
    }
    return '';
  }

  generatePeriodLabels(): string[] {
    const period = this.filterForm.get('period')?.value || 'today';
    switch (period) {
      case 'today':
      case 'yesterday':
        return [
          '9 AM',
          '10 AM',
          '11 AM',
          '12 PM',
          '1 PM',
          '2 PM',
          '3 PM',
          '4 PM',
        ];
      case 'week':
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      case 'lastMonth':
        return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      default:
        return [
          '9 AM',
          '10 AM',
          '11 AM',
          '12 PM',
          '1 PM',
          '2 PM',
          '3 PM',
          '4 PM',
        ];
    }
  }

  generateTrendData(base: number, count: number, volatility: number): number[] {
    return Array.from(
      { length: count },
      () => base * (1 + ((Math.random() - 0.5) * volatility) / 100)
    );
  }

  generateHourlyDistribution(): number[] {
    return [5, 8, 15, 22, 18, 12, 10, 7].map(
      (percent) => this.totalSales * (percent / 100)
    );
  }

  formatCurrency(amount: number): string {
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  formatPercent(value: number): string {
    return value.toFixed(1) + '%';
  }

  exportData(): void {
    console.log('Exporting data...');
  }

  printReport(): void {
    window.print();
  }
}
