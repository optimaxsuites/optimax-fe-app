import { Component } from '@angular/core';

@Component({
  selector: 'app-upload-reciept',
  templateUrl: './upload-reciept.component.html',
  styleUrls: ['./upload-reciept.component.scss']
})
export class UploadRecieptComponent {
  showModal: boolean = false;

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  onFileClick() {
    const fileInput = document.getElementById('upload-receipt') as HTMLInputElement;
    fileInput.click();
  }

  onFileSelect(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      console.log('File selected:', fileInput.files[0].name);
      // Implement additional logic to handle the selected file
    }
  }

  onFileDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const uploadContainer = event.currentTarget as HTMLElement;
    uploadContainer.classList.add('drag-over');
  }

  onFileDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const uploadContainer = event.currentTarget as HTMLElement;
    uploadContainer.classList.remove('drag-over');
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const uploadContainer = event.currentTarget as HTMLElement;
    uploadContainer.classList.remove('drag-over');

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      console.log('File dropped:', event.dataTransfer.files[0].name);
      // Implement additional logic to handle the dropped file
      const fileInput = document.getElementById('upload-receipt') as HTMLInputElement;
      fileInput.files = event.dataTransfer.files; // Optional: update the hidden input
    }
  }

  submitReceipt() {
    console.log('Receipt submitted');
    // Implement logic for submitting the receipt
  }
}
