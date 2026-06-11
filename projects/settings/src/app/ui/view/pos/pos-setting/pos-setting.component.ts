import { Component, OnInit, Type } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PAndISettingComponent } from '../p-and-isetting/p-and-isetting.component';
import { MetadatasComponent } from '../metadatas/metadatas.component';

@Component({
  selector: 'app-pos-setting',
  templateUrl: './pos-setting.component.html',
  styleUrl: './pos-setting.component.scss',
})
export class PosSettingComponent implements OnInit {
  sidebar = false;
  selectedComp: Type<any> | null = null;
  searchTerm = '';

  settings = [
    { name: 'E-store Settings', key: 'estore', icon: 'fas fa-store', component: PAndISettingComponent,
      subSetting: ['Payment information', 'Delivery options', 'Paystack integration'] },
    { name: 'Product Metadata', key: 'metadata', icon: 'fas fa-boxes', component: MetadatasComponent,
      subSetting: ['Categories', 'Tax rates', 'Discounts', 'Suppliers'] },
  ];

  filteredSettings = [...this.settings];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.filteredSettings = [...this.settings];

    this.route.queryParams.subscribe(params => {
      const panel = params['panel'];
      if (panel) {
        const match = this.settings.find(s => s.key === panel);
        if (match && match.component) { this.sidebar = true; this.selectedComp = match.component as any; }
      }
    });
  }

  filterSettings(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredSettings = this.settings.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.subSetting.some(sub => sub.toLowerCase().includes(term))
    );
  }

  openSideBar(setting: any): void {
    if (!setting.component) return;
    this.sidebar = true;
    this.selectedComp = setting.component;
  }
}
