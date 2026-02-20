import { Component } from '@angular/core';
import { ChartType } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

    // Dynamic KPI Cards
  statCards = [
    {
      label: 'Total RFQs',
      value: 24,
      icon: '📄',
      trend: '+4 this week',
      bg: 'bg-blue-100 text-blue-600',
      trendColor: 'text-green-600'
    },
    {
      label: 'Quotes Submitted',
      value: 38,
      icon: '🧾',
      trend: '+12 this month',
      bg: 'bg-purple-100 text-purple-600',
      trendColor: 'text-green-600'
    },
    {
      label: 'Approved Quotes',
      value: 17,
      icon: '✅',
      trend: '45% approval rate',
      bg: 'bg-green-100 text-green-600',
      trendColor: 'text-gray-500'
    },
    {
      label: 'Pending LPOs',
      value: 5,
      icon: '📦',
      trend: 'Needs attention',
      bg: 'bg-yellow-100 text-yellow-600',
      trendColor: 'text-red-500'
    }
  ];
 rfqs = [
    { title: 'Office Supplies', deadline: '24 Feb', status: 'OPEN' },
    { title: 'Building Materials', deadline: '28 Feb', status: 'AWARDED' },
    { title: 'IT Equipment', deadline: '22 Feb', status: 'CLOSED' }
  ];

  lpos = [
    { id: 'LPO-1023', date: '20 Feb' },
    { id: 'LPO-1024', date: '19 Feb' }
  ];

  lineChartType: ChartType = 'line';
  pieChartType: ChartType = 'pie';

  lineChartData = {
    labels: ['Jan','Feb','Mar','Apr','May','Jun'],
    datasets: [
      {
        data: [5, 9, 7, 14, 10, 18],
        label: 'Quotes Submitted',
        fill: true,
        tension: 0.4
      }
    ]
  };

  lineChartOptions = {
      responsive: true,
  maintainAspectRatio: false, // important to respect container height
    plugins: { legend: { display: true } }
  };

  pieChartData = {
      responsive: true,
  maintainAspectRatio: false,
    labels: ['Open','Closed','Awarded'],
      plugins: {
    legend: { display: true, position: 'bottom' }
  },
    datasets: [{ data: [12, 8, 5] }]
  };
}
