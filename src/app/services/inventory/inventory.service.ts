import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private inventorySubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([
    // { id: '1', name: 'Item 1', quantity: 10, price: 100 },
    // { id: '2', name: 'Item 2', quantity: 5, price: 200 }
  ]);

  getInventory(): Observable<any[]> {
    return this.inventorySubject.asObservable();
  }

  addItem(item: any) {
    const currentInventory = this.inventorySubject.value;
    item.id = Date.now().toString();
    this.inventorySubject.next([...currentInventory, item]);
  }

  updateItem(item: any) {
    const currentInventory = this.inventorySubject.value.map(i => (i.id === item.id ? item : i));
    this.inventorySubject.next(currentInventory);
  }

  deleteItem(id: string) {
    const currentInventory = this.inventorySubject.value.filter(i => i.id !== id);
    this.inventorySubject.next(currentInventory);
  }

  getItemById(id: string): any {
    return this.inventorySubject.value.find(i => i.id === id);
  }
}
