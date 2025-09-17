import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TransactionCardService {

  constructor() { }

  initializeTransactionCard(): {
    title1: string,
    title2: string,
    title3: string,

    time1: string,
    time2: string,
    time3: string,

    content1: string,
    content2: string,
    content3: string
  } {
    return {
      title1: 'Assets', 
      title2: 'Power BI', 
      title3: 'Filling SYS', 


      time1: '2 days ago', 
      time2: '2 days ago', 
      time3: 'a day ago', 

      content1: 'Projects',
      content2: '',
      content3: '',
    }
  }
}
