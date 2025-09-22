// import { Injectable } from '@angular/core';
// // import { NgxIndexedDBService } from 'ngx-indexed-db';
// import { map, switchMap } from 'rxjs';
// import { v4 as uuidv4 } from 'uuid';


// @Injectable({
//   providedIn: 'root'
// })
// export class OfflineService {

//    constructor(private dbService: NgxIndexedDBService) {}

//   // ✅ Save product locally
//   addProduct(product: any) {
//     return this.dbService.add('products', product);
//   }

//   getProducts() {
//     return this.dbService.getAll('products');
//   }

//   // ✅ Save offline transaction
//   addTransaction(transaction: any) {
//     const tx = {
//       ...transaction,
//       id: uuidv4(), // unique client ID
//       createdAt: new Date(),
//       isSynced: false
//     };
//     return this.dbService.add('transactions', tx);
//   }

//   getPendingTransactions() {
//   return this.dbService.getAll('transactions').pipe(
//     map((txs: any[]) => txs.filter(t => !t.isSynced))
//   );
// }


//   markTransactionSynced(id: string) {
//     return this.dbService.update('transactions', { id, isSynced: true });
//   }

// upsertTransaction(transaction: any) {
//   return this.dbService.getByKey('transactions', transaction.id).pipe(
//     switchMap((existing: any) => {
//       if (existing) {
//         const updated = { ...existing, ...transaction, isSynced: false };
//         return this.dbService.update('transactions', updated);
//       } else {
//         const newTx = {
//           ...transaction,
//           id: transaction.id || uuidv4(),
//           createdAt: new Date(),
//           isSynced: false,
//         };
//         return this.dbService.add('transactions', newTx);
//       }
//     })
//   );
// }


// }
