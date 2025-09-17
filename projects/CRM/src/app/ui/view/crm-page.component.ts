import { Component } from '@angular/core';
import { DataService } from '../service/data.service';

@Component({
  selector: 'app-crm-page',
  templateUrl: './crm-page.component.html',
  styleUrl: './crm-page.component.scss',
})
export class CrmPageComponent {
  tabLabel: string = 'Vendor List';

  constructor(private tabLabelService: DataService) {}

  ngOnInit() {
    this.tabLabelService.tabLabel$.subscribe((label) => {
      this.tabLabel = label;
    });
  }
}
