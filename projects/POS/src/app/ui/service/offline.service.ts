import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, catchError, firstValueFrom, map, Observable, of, switchMap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';


@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  private products$ = new BehaviorSubject<any[]>([]);
  private categories$ = new BehaviorSubject<any[]>([]);
  private pendingPayments$ = new BehaviorSubject<any[]>([]);
  private pendingTransactions$ = new BehaviorSubject<any[]>([]);

   constructor(private dbService: NgxIndexedDBService) {
    this.loadInitialData();
   }

 private loadInitialData() {
    this.dbService.getAll('products').pipe(catchError(() => of([]))).subscribe(data => this.products$.next(data));
    this.dbService.getAll('categories').pipe(catchError(() => of([]))).subscribe(data => this.categories$.next(data));
    this.dbService.getAll('pendingPayments').pipe(catchError(() => of([]))).subscribe(data => this.pendingPayments$.next(data));
    this.dbService.getAll('savedTransactions').pipe(catchError(() => of([]))).subscribe(data => this.pendingTransactions$.next(data));
  }
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
  // async addPendingPayment(payment: any) {
  //       try {
  //         return this.dbService.add('pendingPayments', payment).subscribe((result) => {
  //                 this.pendingPayments$.next([...this.pendingPayments$.value, payment]);
  //                 return  console.log('result: ', result);
  //           });
  //       } catch (error) {
  //           return console.error("❌ Error saving pending payment:", error);
  //       }
  // }

  async addPendingPayment(payment: any) {
        try {
    const cleanPayment = JSON.parse(JSON.stringify(payment));
    delete cleanPayment.__dbKey;

    const generatedKey = await firstValueFrom(
      this.dbService.add('pendingPayments', cleanPayment)
    );

    const savedPayment = { ...cleanPayment, __dbKey: generatedKey };

    this.pendingPayments$.next([...this.pendingPayments$.value, savedPayment]);

    console.log('✅ Pending payment saved with key:', generatedKey);
    return generatedKey;
  } catch (error) {
    console.error("❌ Error saving pending payment:", error);
    throw error;
  }
}




   async addPendingTransactions(transaction: any) {
        try {
          return this.dbService.add('savedTransactions', transaction).subscribe((result) => {
              this.pendingTransactions$.next([...this.pendingTransactions$.value, transaction]);
            return  console.log('result: ', result);
            });
        } catch (error) {
            return console.error("❌ Error saving transaction:", error);
        }
    }



  removePendingTransaction(id: number){
    return this.dbService.delete('savedTransactions', id).subscribe((successDeleted) => {
        this.pendingTransactions$.next([...successDeleted]);
        console.log('success? ', successDeleted);
    });;    
  }  

   updatePendingTransaction(payment: any): Observable<any> {
        return this.dbService.update('savedTransactions', payment);
      
    }

  removePendingPayment(id: number){
    return this.dbService.delete('pendingPayments', id).subscribe((successDeleted) => {
        this.pendingPayments$.next([...successDeleted]);
        console.log('success? ', successDeleted);
        });;    
  }  

   updatePendingPayment(payment: any): Observable<any> {
        return this.dbService.update('pendingPayments', payment);
    }

  getPendingPayments(): Observable<any[]> {
        // return this.dbService.getAll('pendingPayments');
          return this.pendingPayments$.asObservable();
  }

  getPendingTransactions(): Observable<any[]> {
        // return this.dbService.getAll('savedTransactions');
        return this.pendingTransactions$.asObservable();
  }


  getPendingPayment(id:any): Observable<any[]> {
        return this.dbService.getByKey('pendingPayments', id);
  }

  async clearPendingPayments(): Promise<void> {
        await this.dbService.clear('pendingPayments').subscribe((successDeleted) => {
        this.pendingPayments$.next([]);
        console.log('success? ', successDeleted);
        });
    } 

  
  async clearPendingTransactions(): Promise<void> {
        await this.dbService.clear('savedTransactions').subscribe((successDeleted) => {
        this.pendingTransactions$.next([]);
        console.log('success? ', successDeleted);
        });
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
