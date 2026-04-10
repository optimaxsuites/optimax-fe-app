// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-item-detail',
//   templateUrl: './item-detail.component.html',
//   styleUrl: './item-detail.component.scss'
// })
// export class ItemDetailComponent {

// }



import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-item-details',
  templateUrl: './item-detail.component.html',
  styleUrls: ['./item-detail.component.scss']
})
export class ItemDetailComponent implements OnInit {
  @Input() item: any; // Replace 'any' with a specific type/interface if available
  tabs: string[] = ['Table', 'Card'];
  activeTab: string = 'Table';

  constructor() {}

  ngOnInit(): void {
    // Set the default active tab if needed
    this.activeTab = this.tabs[0];
  }
}
