import { Injectable } from '@angular/core';
import { createWorker, WorkerParams } from 'tesseract.js';

type Lang = { code: string; name: string };

@Injectable({
  providedIn: 'root',
})
export class HotelServiceService {
  private worker: any;

  constructor() {
    this.initializeWorker();
  }

  private async initializeWorker() {
    await this.worker.loadLanguage('eng');
    await this.worker.initialize('eng');
  }

  async recognizeText(imageData: string): Promise<string> {
    try {
      const {
        data: { text },
      } = await this.worker.recognize(imageData);
      return text;
    } catch (error) {
      console.error('OCR Error:', error);
      throw error;
    }
  }

  async terminateWorker() {
    await this.worker.terminate();
  }
}
