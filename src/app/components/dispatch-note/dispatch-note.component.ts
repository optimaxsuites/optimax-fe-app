import { Component } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dispatch-note',
  templateUrl: './dispatch-note.component.html',
  styleUrl: './dispatch-note.component.scss'
})
export class DispatchNoteComponent {
  tableData: any[];


  constructor(
    private topProductsService: TopProductService,
    private router: Router,

  ) {
    this.tableData = [];
   }

  ngOnInit(): void {
    this.tableData = this.topProductsService.initializeTopProduct();
  }

  navigateToForm(){
    this.router.navigate(['/sales/dispatch-note/dispatch-note-form']);
  }
  editItem(id: string) {
  }
  deleteItem(id: string) {
  }
  viewItem(id: string){
  }
}
