import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TopProductService } from 'src/app/ui/dashboard/service/top-product/top-product.service';

@Component({
  selector: 'app-dispatch-note',
  templateUrl: './dispatch-note.component.html',
  styleUrl: './dispatch-note.component.scss'
})
export class DispatchNoteComponent {
  tableData: any[];
  selectedItems!: any[];



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
