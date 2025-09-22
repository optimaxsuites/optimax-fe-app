import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { firstValueFrom, map, switchMap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';


@Injectable({
  providedIn: 'root'
})
export class OfflineService {

   constructor(private dbService: NgxIndexedDBService) {}

 async addProduct(product: any) {
  const mappedProduct = {
    id: product.id,
    name: product.name,
    sellingPrice: product.sellingPrice,
    quantity: product.quantity,
    sku: product.sku,
    code: product.code,
    category: product.productCategory?.name ?? '',
    isSynced: product.isSynced
  };

  try {
    const result = this.dbService.add('products', mappedProduct)
    console.log('Saved product:', result);
    return result;
  } catch (err) {
    console.error('Error saving product:', err);
    throw err;
  }
}



  getProducts() {
    return this.dbService.getAll('products')
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


}
