import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { arrOfCustomReports } from '../custom-report-data';
import { ChartType } from 'ng-apexcharts';

@Component({
  selector: 'app-create-report',
  templateUrl: './create-report.component.html',
  // styleUrls: ['./create-report.component.scss'],
})
export class CreateReportComponent implements OnInit {
  //@ts-ignore
  reportForm: FormGroup;

  // Example chart types you can display for each chart
  chartTypes: string[] = [
    'Sales',
    'Expenses',
    'Inventory Turnover',
    'Profit Margin',
    'Revenue',
    // Add more chart types as needed
  ];

  // Timeframe options for each chart
  timeFrames: string[] = [
    'Current Day',
    'Past Week',
    'Past Month',
    'Past Quarter',
    'Past Year',
    'Past Decade',
    'Single Day',
  ];
  chartStyles: ChartType[] = [
    'bar',
    'area',
    'boxPlot',
    'bubble',
    'candlestick',
    'donut',
    'heatmap',
    'line',
    'pie',
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.reportForm = this.fb.group({
      reportName: ['', Validators.required],
      additionalInfo: [''],
      charts: this.fb.array([]),
    });
  }

  get charts(): FormArray {
    return this.reportForm.get('charts') as FormArray;
  }

  addChart(): void {
    // Only add up to 9 charts
    if (this.charts.length < 9) {
      this.charts.push(
        this.fb.group({
          chartType: ['', Validators.required],
          timeframe: ['', Validators.required],
          chartStyle: ['', Validators.required],
          // dataFile: [null], // or use Validators.required if needed
        })
      );
    }
  }

  removeChart(index: number): void {
    this.charts.removeAt(index);
  }

  onSubmit(): void {
    console.log('Report form data:', this.charts.value);
    if (this.reportForm.valid) {
      // Handle form submission
      // e.g., send data to your service or backend
    } else {
      // Handle form errors
      console.log('Form is invalid');
    }

    arrOfCustomReports.push({
      name: this.reportForm.value.reportName,
      charts: this.charts.value,
    });
  }
}
