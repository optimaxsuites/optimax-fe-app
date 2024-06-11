import { Injectable } from '@angular/core';
// import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  constructor() {}
  // uniqueId = uuidv4();
  // rfqData.id = uniqueId;
  // localStorage.setItem(`rfqData_${uniqueId}`, JSON.stringify(rfqData));

  getRfqData() {
    const rfqData = localStorage.getItem('rfqData');
    return rfqData ? JSON.parse(rfqData) : null;
  }
}

function uuidv4() {
  throw new Error('Function not implemented.');
}
