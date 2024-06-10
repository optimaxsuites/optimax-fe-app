import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  const uniqueId = uuidv4(); // Generate unique ID
  rfqData.id = uniqueId; // Attach unique ID to rfqData
  localStorage.setItem(`rfqData_${uniqueId}`, JSON.stringify(rfqData)); // Save

  getRfqData() {
    const rfqData = localStorage.getItem('rfqData');
    return rfqData ? JSON.parse(rfqData) : null;
  }
}

function uuidv4() {
  throw new Error('Function not implemented.');
}

