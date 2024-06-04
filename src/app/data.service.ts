import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private rfqData = new BehaviorSubject<any>(null);
  currentRfqData = this.rfqData.asObservable();

  updateRfqData(data: any) {
    this.rfqData.next(data);
  }

  constructor() {}
}
