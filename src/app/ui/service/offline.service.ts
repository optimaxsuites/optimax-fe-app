import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, firstValueFrom, map, Observable, switchMap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';


@Injectable({
  providedIn: 'root'
})
export class OfflineService {


   constructor(private dbService: NgxIndexedDBService) {}

//  isOffline(){
//     return navigator.onLine
//  }

 async addProduct(product: any) {
console.log("caching offline")

  try {
  return this.dbService.bulkAdd('products', product).subscribe((result) => {
       return  console.log('result: ', result);
      });
  } catch (err) {
    console.error('Error saving product:', err);
    throw err;
  }
}

 async addCategories(category: any) {
console.log("caching offline")

  try {
  return this.dbService.bulkAdd('categories', category).subscribe((result) => {
       return  console.log('result: ', result);
      });
  } catch (err) {
    console.error('Error saving categories:', err);
    throw err;
  }
}



  getProducts() {
    return this.dbService.getAll('products')
  }
  getCategories(){
    return this.dbService.getAll('categories')

  }
  async addPendingPayment(payment: any) {
        try {
          return this.dbService.add('pendingPayments', payment).subscribe((result) => {
            return  console.log('result: ', result);
            });
        } catch (error) {
            return console.error("❌ Error saving pending payment:", error);
        }
    }

  removePendingPayment(id: number){
    return this.dbService.delete('pendingPayments', id).subscribe((successDeleted) => {
        console.log('success? ', successDeleted);
        });;    
  }  

   updatePendingPayment(payment: any): Observable<any> {
        return this.dbService.update('pendingPayments', payment);
    }

  getPendingPayments(): Observable<any[]> {
        return this.dbService.getAll('pendingPayments');
    }

  getPendingPayment(id:any): Observable<any[]> {
        return this.dbService.getByKey('pendingPayments', id);
  }

  async clearPendingPayments(): Promise<void> {
        await this.dbService.clear('pendingPayments').subscribe((successDeleted) => {
        console.log('success? ', successDeleted);
        });
    } 

  addTransaction(transaction: any) {
    const tx = {
      ...transaction,
      id: uuidv4(),
      createdAt: new Date(),
      isSynced: false
    };
    return this.dbService.add('transactions', tx);
  }

  getPendingTransactions() {
  return this.dbService.getAll('transactions').pipe(
    map((txs: any[]) => txs.filter(t => !t.isSynced))
  );
}


  markTransactionSynced(id: string) {
    return this.dbService.update('transactions', { id, isSynced: true });
  }

upsertTransaction(transaction: any) {
  return this.dbService.getByKey('transactions', transaction.id).pipe(
    switchMap((existing: any) => {
      if (existing) {
        const updated = { ...existing, ...transaction, isSynced: false };
        return this.dbService.update('transactions', updated);
      } else {
        const newTx = {
          ...transaction,
          id: transaction.id || uuidv4(),
          createdAt: new Date(),
          isSynced: false,
        };
        return this.dbService.add('transactions', newTx);
      }
    })
  );
}

async clearProducts() {
  return this.dbService.clear('products').subscribe((successDeleted) => {
  console.log('success? ', successDeleted);
});;
}

async clearCategories() {
  return this.dbService.clear('categories').subscribe((successDeleted) => {
  console.log('success? ', successDeleted);
});;
}

}
