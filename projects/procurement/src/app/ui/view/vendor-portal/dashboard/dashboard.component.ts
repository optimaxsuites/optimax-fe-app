import { Component } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexDataLabels,
  ApexTitleSubtitle,
  ApexNonAxisChartSeries,
  ApexLegend
} from "ng-apexcharts";

export type ChartOptions = {
  lineSeries: ApexAxisChartSeries;
  lineChart: ApexChart;
  lineXAxis: ApexXAxis;
  lineStroke: ApexStroke;
  lineDataLabels: ApexDataLabels;
  lineTitle: ApexTitleSubtitle;

  pieSeries: ApexNonAxisChartSeries;
  pieChart: ApexChart;
  pieLabels: string[];
  pieLegend: ApexLegend;
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

// TypeScript: statCards with charts
statCards = [
  {
    label: 'Total RFQs',
    value: 24,
    trend: '+4 this week',
    trendColor: 'text-green-600',
    series: [
      { data: [2, 4, 3, 5, 6, 8, 7, 9, 10, 12, 11, 14] } // sample weekly data
    ]
  },
  {
    label: 'Quotes Submitted',
    value: 38,
    trend: '+12 this month',
    trendColor: 'text-green-600',
    series: [
      { data: [3, 5, 6, 4, 7, 8, 9, 6, 10, 12, 13, 15] } // sample monthly data
    ]
  },
  {
    label: 'Approved Quotes',
    value: 17,
    trend: '45% approval rate',
    trendColor: 'text-gray-500',
    series: [
      { data: [1, 2, 3, 2, 4, 5, 4, 6, 5, 7, 6, 8] } // sample approved quotes over time
    ]
  },
  {
    label: 'Pending LPOs',
    value: 5,
    trend: 'Needs attention',
    trendColor: 'text-red-500',
    series: [
      { data: [0, 1, 1, 2, 2, 3, 2, 3, 4, 3, 4, 5] } // sample pending LPOs over time
    ]
  }
];

  // ApexCharts config
  sparkChart: ApexChart = {
    type: 'area',
    height: 80,
    sparkline: { enabled: true }
  };

  sparkStroke: ApexStroke = {
    curve: 'straight',
    width: 2
  };

  sparkTooltip = {
    enabled: false
  };

 rfqs = [
    { title: 'Office Supplies', deadline: '24 Feb', status: 'OPEN' },
    { title: 'Building Materials', deadline: '28 Feb', status: 'AWARDED' },
    { title: 'IT Equipment', deadline: '22 Feb', status: 'CLOSED' }
  ];

  lpos = [
    { id: 'LPO-1023', date: '20 Feb' },
    { id: 'LPO-1024', date: '19 Feb' }
  ];

/* ---------------- SERIES ---------------- */

lineSeries: ApexAxisChartSeries = [
  {
    name: "Quotes Submitted",
    data: [12, 10, 8, 6, 7, 9, 15, 22, 28, 24, 18, 14]
  }
];


/* ---------------- CHART ---------------- */

lineChart: ApexChart = {
  type: "area",
  height: 260,
  width: 1450,
  toolbar: { show: false },
  zoom: { enabled: false },
  animations: {
    enabled: true,
    easing: "easeinout",
    speed: 800
  }
};


/* ---------------- X AXIS ---------------- */

lineXAxis: ApexXAxis = {
  categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  labels: {
    style: {
      colors: "#9CA3AF",
      fontSize: "12px"
    }
  },
  axisBorder: { show: false },
  axisTicks: { show: false }
};


/* ---------------- STROKE ---------------- */

lineStroke: ApexStroke = {
  curve: "smooth",
  width: 4
};


/* ---------------- GRID ---------------- */

grid = {
  borderColor: "#f1f1f1",
  strokeDashArray: 4,
  yaxis: { lines: { show: true } },
  xaxis: { lines: { show: false } }
};


/* ---------------- GRADIENT FILL ---------------- */

fill = {
  type: "gradient",
  gradient: {
    shadeIntensity: 1,
    opacityFrom: 0.35,
    opacityTo: 0.03,
    stops: [0, 100]
  }
};


/* ---------------- MARKERS ---------------- */

markers = {
  size: 0,
  hover: { size: 6 }
};


/* ---------------- DATA LABELS ---------------- */

lineDataLabels: ApexDataLabels = {
  enabled: false
};


/* ---------------- TOOLTIP ---------------- */

tooltip = {
  theme: "light",
  x: { show: true },
  y: {
    formatter: (val:number) => `${val} Quotes`
  }
};


/* ---------------- TITLE ---------------- */

lineTitle: ApexTitleSubtitle = {
  text: ""
};


  /* ---------------- PIE CHART ---------------- */
pieSeries: ApexNonAxisChartSeries = [12, 8, 5];

pieChart: ApexChart = {
  type: "donut",
  height: 320
};

pieLabels = ["Open","Closed","Awarded"];

pieLegend: ApexLegend = {
  position: "bottom",
  fontSize: "14px",
  itemMargin: {
    horizontal: 10,
    vertical: 5
  }
};

/* ---------- PREMIUM OPTIONS ---------- */

piePlotOptions = {
  pie: {
    expandOnClick: true,
    donut: {
      size: "70%",
      labels: {
        show: true,
        name: { show: true },
        value: { show: true },
        total: {
          show: true,
          label: "Total RFQs",
          formatter: () => "25"
        }
      }
    }
  }
};

pieStroke = {
  width: 0
};

pieDataLabels = {
  enabled: false
};

pieFill = {
  type: "gradient"
};

pieStates = {
  hover: {
    filter: {
      type: "lighten",
      value: 0.15
    }
  }
};
}
