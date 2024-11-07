import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor() {
    
   }
   private data: any[] = [];

  setData(data: any) {
    this.data = data;
    localStorage.setItem('sharedData', JSON.stringify(data));
  }

  getData(): any[] {
    return this.data;
  }
}
