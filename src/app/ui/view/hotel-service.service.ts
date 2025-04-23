import { Injectable } from '@angular/core';
import * as Tesseract from 'tesseract.js';
import { PSM } from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  fields?: {
    firstName?: string;
    lastName?: string;
    idNumber?: string;
    gender?: string;
    country?: string;
    dob?: string;
    [key: string]: string | undefined;
  };
}

@Injectable({
  providedIn: 'root',
})
export class HotelServiceService {
  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private initFailCount = 0;

  constructor() {
    // Initialize on-demand instead of on service creation
  }

  async recognizeFromBuffer(imageBuffer: ArrayBuffer): Promise<OCRResult> {
    if (!this.isInitialized) {
      await this.initializeWorker();
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      // Convert buffer to a format Tesseract can process
      const blob = new Blob([imageBuffer]);
      const imageUrl = URL.createObjectURL(blob);

      // Perform OCR on the image
      const result = await this.worker.recognize(imageUrl);

      // Release the object URL
      URL.revokeObjectURL(imageUrl);

      // Extract structured data from the OCR text
      const fields = this.extractIdFields(result.data.text);

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        fields,
      };
    } catch (error) {
      console.error('OCR processing error:', error);

      // Try reinitializing the worker if recognition fails
      if (this.worker) {
        try {
          await this.worker.terminate();
          this.worker = null;
          this.isInitialized = false;
          await this.initializeWorker();

          // Try once more with the new worker
          return this.recognizeFromBuffer(imageBuffer);
        } catch (reinitError) {
          console.error(
            'Failed to reinitialize worker for retry:',
            reinitError
          );
        }
      }

      throw new Error('Failed to process document with OCR');
    }
  }

  async recognizeText(imageData: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initializeWorker();
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      const result = await this.worker.recognize(imageData);
      return result.data.text;
    } catch (error) {
      console.error('OCR Error:', error);
      throw error;
    }
  }

  async terminateWorker() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  private async initializeWorker(): Promise<void> {
    if (this.isInitialized && this.worker) return;

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise(async (resolve, reject) => {
      try {
        // Initialize Tesseract worker with optimized settings for ID scanning
        this.worker = await Tesseract.createWorker();
        console.log('Tesseract worker created successfully');

        // Initialize with language data
        await this.worker.load();
        console.log('Language loaded successfully');

        await this.worker.reinitialize('eng');
        console.log('Worker initialized successfully');

        // Set parameters optimized for ID cards
        // Note: these parameters must be set during initialization phase
        const params = {
          tessedit_char_whitelist:
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/. ',
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          preserve_interword_spaces: '1',
        };

        await this.worker.setParameters(params);
        console.log('OCR parameters set successfully');

        this.isInitialized = true;
        this.initFailCount = 0;
        resolve();
      } catch (error) {
        console.error('Failed to initialize OCR worker:', error);
        this.worker = null;
        this.initFailCount++;

        // If we've failed multiple times, try a more basic initialization
        if (this.initFailCount <= 3) {
          try {
            console.log('Trying simplified OCR worker initialization');
            this.worker = await Tesseract.createWorker();
            await this.worker.load('eng');
            await this.worker.reinitialize('eng');

            this.isInitialized = true;
            resolve();
          } catch (fallbackError) {
            console.error('Fallback OCR initialization failed:', fallbackError);
            this.worker = null;
            reject(fallbackError);
          }
        } else {
          reject(error);
        }
      } finally {
        this.initializationPromise = null;
      }
    });

    return this.initializationPromise;
  }

  // Enhanced extraction of ID fields from OCR text
  private extractIdFields(text: string): OCRResult['fields'] {
    const fields: OCRResult['fields'] = {};
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);

    // Improved patterns for ID recognition
    const nameRegex =
      /^([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?(?:\s+([A-Z][a-z]+))?$/;
    const idRegex = /([A-Z0-9]{6,20})/;
    const dobRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
    const countryRegex =
      /(Nigeria|United States|United Kingdom|Canada|Ghana|South Africa|Kenya|Germany|France|China|India)/i;

    // Common ID card field labels
    const idLabels = [
      'id',
      'id no',
      'id number',
      'identification',
      'document no',
    ];
    const nameLabels = ['name', 'full name', 'surname', 'given name'];
    const dobLabels = ['birth', 'dob', 'born', 'date of birth'];
    const genderLabels = ['sex', 'gender', 'male', 'female', 'm', 'f'];

    console.log('OCR Text Lines:', lines);

    // First pass: Look for labeled fields
    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Look for labeled ID number
      if (idLabels.some((label) => lowerLine.includes(label))) {
        const matches = line.match(/[A-Z0-9]{6,20}/);
        if (matches) {
          fields.idNumber = matches[0];
          console.log('Found ID Number:', fields.idNumber);
        }
      }

      // Look for labeled name
      if (nameLabels.some((label) => lowerLine.includes(label))) {
        // Extract the part after the label
        const namePart = line.split(/:\s*|[\s]{2,}/).pop();
        if (namePart && nameRegex.test(namePart)) {
          const nameParts = namePart.split(/\s+/);
          if (nameParts.length >= 2) {
            fields.firstName = nameParts[0];
            fields.lastName = nameParts[nameParts.length - 1];
            console.log('Found Name:', fields.firstName, fields.lastName);
          }
        }
      }

      // Look for labeled gender
      if (genderLabels.some((label) => lowerLine.includes(label))) {
        if (lowerLine.includes('female') || lowerLine.includes('f')) {
          fields.gender = 'Female';
        } else if (lowerLine.includes('male') || lowerLine.includes('m')) {
          fields.gender = 'Male';
        }
      }

      // Look for labeled date of birth
      if (dobLabels.some((label) => lowerLine.includes(label))) {
        const matches = line.match(dobRegex);
        if (matches) {
          fields.dob = matches[0];
          console.log('Found DOB:', fields.dob);
        }
      }

      // Look for country
      if (countryRegex.test(line)) {
        const matches = line.match(countryRegex);
        if (matches) {
          fields.country = matches[0];
          console.log('Found Country:', fields.country);
        }
      }
    }

    // Second pass: Look for unlabeled patterns if we haven't found certain fields
    if (!fields.firstName || !fields.lastName) {
      for (const line of lines) {
        if (nameRegex.test(line)) {
          const nameParts = line.split(/\s+/);
          if (nameParts.length >= 2) {
            fields.firstName = fields.firstName || nameParts[0];
            fields.lastName =
              fields.lastName || nameParts[nameParts.length - 1];
            console.log(
              'Found Name (pattern):',
              fields.firstName,
              fields.lastName
            );
            break;
          }
        }
      }
    }

    if (!fields.idNumber) {
      for (const line of lines) {
        const matches = line.match(/[A-Z0-9]{6,20}/);
        if (matches && !/[a-z]/.test(matches[0])) {
          fields.idNumber = matches[0];
          console.log('Found ID Number (pattern):', fields.idNumber);
          break;
        }
      }
    }

    if (!fields.dob) {
      for (const line of lines) {
        const matches = line.match(dobRegex);
        if (matches) {
          fields.dob = matches[0];
          console.log('Found DOB (pattern):', fields.dob);
          break;
        }
      }
    }

    return fields;
  }
}
