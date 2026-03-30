import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { QueryComponent } from './query/query.component';
import { AdHocComponent } from './ad-hoc/ad-hoc.component';

@Component({
  selector: 'app-payrol-extras',
  templateUrl: './payrol-extras.component.html',
  styleUrl: './payrol-extras.component.scss'
})
export class PayrolExtrasComponent {
tabsConfig: TabConfig[] = [
  {  name: "Queries",
    component: QueryComponent,
    icon: "fa fa-question-circle",
    hasDropdown: false,
    dropdownOptions: [], 
  },
  {  name: "Ad HOCs",
    component: AdHocComponent,
    icon: "fa fa-money-bill",
    hasDropdown: false,
    dropdownOptions: [], 
  }
]
}
