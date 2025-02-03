import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-excel-import',
  templateUrl: './excel-import.component.html',
  styleUrls: [],
})
export class ExcelImportComponent {
  @Output() fileUploaded = new EventEmitter<File>();

  downloadTemplate(): void {
    const templateUrl = '/assets/templates/product-template.xlsx';
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = 'product-template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file: File = input.files[0];
      this.fileUploaded.emit(file);
    }
  }
}
