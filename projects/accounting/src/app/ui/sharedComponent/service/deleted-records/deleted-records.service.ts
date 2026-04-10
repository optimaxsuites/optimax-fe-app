import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DeletedRecord {
  id: string; // unique ID for the deletion event
  originalData: any;
  deletedBy: string; // username
  deletedAt: Date;
  recordType: string; // e.g., 'Account', 'Transaction'
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeletedRecordsService {
  private _deletedRecords = new BehaviorSubject<DeletedRecord[]>([]);
  public deletedRecords$ = this._deletedRecords.asObservable();

  constructor() {
    // Load from localStorage on init
    const saved = localStorage.getItem('deleted_records');
    if (saved) {
      try {
        this._deletedRecords.next(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse deleted records', e);
      }
    }
  }

  addRecord(record: Omit<DeletedRecord, 'id' | 'deletedAt'>) {
    const newRecord: DeletedRecord = {
      ...record,
      id: this.generateId(),
      deletedAt: new Date()
    };

    const current = this._deletedRecords.value;
    const updated = [newRecord, ...current];
    this._deletedRecords.next(updated);
    this.saveToStorage(updated);
  }

  getRecords(): Observable<DeletedRecord[]> {
    return this.deletedRecords$;
  }

  // Optional: Restore functionality if needed later
  // restoreRecord(id: string) { ... }

  private saveToStorage(records: DeletedRecord[]) {
    localStorage.setItem('deleted_records', JSON.stringify(records));
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
