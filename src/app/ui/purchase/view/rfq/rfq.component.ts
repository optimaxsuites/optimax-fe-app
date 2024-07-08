import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from 'src/app/ui/crm/service/data.service';
import { v4 as generateUniqueId } from 'uuid';

@Component({
  selector: 'app-rfq',
  templateUrl: './rfq.component.html',
  styleUrl: './rfq.component.scss',
})
export class RfqComponent implements OnInit {
  rfqList: any[] = [];
  constructor(
    private dataService: DataService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.dataService.rfqList$.subscribe((rfqList) => {
      this.rfqList = rfqList;
      this.cdr.detectChanges();
    });

    const storedRfqList = localStorage.getItem('rfqList');
    if (storedRfqList) {
      this.rfqList = JSON.parse(storedRfqList);
    } else {
      this.rfqList = []; // Initialize with an empty array if no data is found
    }
  }
 
  viewRfq(id: string) {
    this.router.navigate(['/purchase/rfq-modal', id]);
  }

  deleteRfq(id: string): void {
    this.dataService.deleteRfq(id);
    this.cdr.detectChanges();
  }

  duplicateRfq(rfq: any): void {
    this.dataService.duplicateRfq(rfq);
    this.cdr.detectChanges();
  }
}
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  // throw new Error('Function not implemented.');
}
