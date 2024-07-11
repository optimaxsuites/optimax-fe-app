import { Component, ViewChild } from '@angular/core';


@Component({
  selector: 'app-levels',
  templateUrl: './levels.component.html',
  styleUrls: ['./levels.component.scss']
})
export class LevelsComponent {

  chartOptions = {
    title: {
      text: ' ',
    },
    theme: 'light1',
    animationEnabled: true,
    exportEnabled: true,
    axisY: {
      includeZero: true,
      valueFormatString: '₦#,##0k',
    },
    data: [
      {
        type: 'line', //change type to bar, line, area, pie, etc
        yValueFormatString: '₦#,##0k',
        color: '#25925B ',
        dataPoints: [
          { label: 'Jan', y: 172 },
          { label: 'Feb', y: 189 },
          { label: 'Mar', y: 201 },
          { label: 'Apr', y: 83 },
          { label: 'May', y: 166 },
          { label: 'Jun', y: 196 },
          { label: 'Jul', y: 330 },
          { label: 'Aug', y: 167 },
          { label: 'Sep', y: 175 },
          { label: 'Oct', y: 95 },
          { label: 'Nov', y: 156 },
          { label: 'Dec', y: 164 },
        ],
      },
    ],
  };

}
