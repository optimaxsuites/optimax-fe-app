import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeletedRecord, DeletedRecordsService } from '../../sharedComponent/service/deleted-records/deleted-records.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-deleted-records',
  templateUrl: './deleted-records.component.html',
  styleUrl: './deleted-records.component.scss'
})
export class DeletedRecordsComponent implements OnInit {
  deletedRecords: DeletedRecord[] = [];
  selectedRecord: DeletedRecord | null = null;
  showDetailsModal = false;

  constructor(
    private deletedRecordsService: DeletedRecordsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.deletedRecordsService.deletedRecords$.subscribe(records => {
      this.deletedRecords = records;
    });
  }

  goBack() {
    window.history.back();
  }

  viewDetails(record: DeletedRecord) {
    this.selectedRecord = record;
    this.showDetailsModal = true;
  }
  
  closeModal() {
    this.showDetailsModal = false;
    this.selectedRecord = null;
  }
}
