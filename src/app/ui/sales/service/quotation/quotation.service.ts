import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QuotationService {

  private itemSubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

  getItem(): Observable<any[]> {
    return this.itemSubject.asObservable();
  }

  addItem(item: any) {
    const currentItem = this.itemSubject.value;
    item.id = Date.now().toString();
    this.itemSubject.next([...currentItem, item]);
  }

  updateItem(item: any) {
    const currentItem = this.itemSubject.value.map(i => (i.id === item.id ? item : i));
    this.itemSubject.next(currentItem);
  }

  deleteItem(id: string) {
    const currentItem = this.itemSubject.value.filter(i => i.id !== id);
    this.itemSubject.next(currentItem);
  }

  getItemById(id: string): any {
    return this.itemSubject.value.find(i => i.id === id);
  }
}
