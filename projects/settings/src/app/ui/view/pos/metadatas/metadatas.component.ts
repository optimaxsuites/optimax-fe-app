import { Component } from '@angular/core';

@Component({
  selector: 'app-metadatas',
  templateUrl: './metadatas.component.html',
  styleUrl: './metadatas.component.scss'
})
export class MetadatasComponent {
  activeTab: 'categories' | 'taxes' | 'discount' | 'supplier' = 'categories';


   setActiveTab(tab: 'categories' | 'taxes' | 'discount' | 'supplier'): void {
    this.activeTab = tab;
  }
}
