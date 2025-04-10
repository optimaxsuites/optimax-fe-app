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

  constructor() {
    // Initialize on service creation
    this.initializeWorker();
  }

  private async initializeWorker(): Promise<void> {
    if (this.isInitialized) return;

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise(async (resolve, reject) => {
      try {
        // Initialize Tesseract worker with optimized settings for ID scanning
        this.worker = await Tesseract.createWorker();

        // Set logger if needed
        const logger = {
          logger: (m: any) => console.log(m),
        };

        // Load English language data
        await this.worker.load();

        // Initialize the OCR engine with optimal settings for ID cards
        await this.worker.reinitialize('eng');

        // Set parameters for ID card scanning
        await this.worker.setParameters({
          tessedit_char_whitelist:
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/.',
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // Numeric value (not string) for single uniform block of text
        });

        this.isInitialized = true;
        resolve();
      } catch (error) {
        console.error('Failed to initialize OCR worker:', error);
        this.worker = null;
        reject(error);
      } finally {
        this.initializationPromise = null;
      }
    });

    return this.initializationPromise;
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

    // Match patterns with special attention to common ID card formats
    for (const line of lines) {
      // Name detection - look for lines with proper name formatting
      if (!fields.firstName && !fields.lastName && nameRegex.test(line)) {
        const matches = line.match(nameRegex);
        if (matches) {
          if (matches[3]) {
            // Format: FIRST MIDDLE LAST or LAST FIRST MIDDLE
            const nameParts = [matches[1], matches[2], matches[3]];

            // Heuristic: If first part is shorter or equal to other parts, likely FIRST MIDDLE LAST
            // Otherwise likely LAST FIRST MIDDLE
            if (
              nameParts[0].length <=
              Math.max(nameParts[1].length, nameParts[2].length)
            ) {
              fields.firstName = `${nameParts[0]} ${nameParts[1]}`;
              fields.lastName = nameParts[2];
            } else {
              fields.lastName = nameParts[0];
              fields.firstName = `${nameParts[1]} ${nameParts[2]}`;
            }
          } else if (matches[2]) {
            // Format: FIRST LAST
            fields.firstName = matches[1];
            fields.lastName = matches[2];
          }
        }
      }

      // Look for ID number - typically a mix of letters and numbers with consistent format
      if (!fields.idNumber && idRegex.test(line)) {
        // Look for lines containing ID/Document number explicitly
        if (
          line.toLowerCase().includes('id') ||
          line.toLowerCase().includes('document') ||
          line.toLowerCase().includes('no.') ||
          line.toLowerCase().includes('number')
        ) {
          const idMatch = line.match(idRegex);
          if (idMatch) fields.idNumber = idMatch[1];
        } else {
          // If no explicit label, look for patterns matching ID numbers
          const possibleIds = line.match(/([A-Z0-9]{6,20})/g) || [];
          if (possibleIds.length === 1) {
            fields.idNumber = possibleIds[0];
          }
        }
      }

      // Extract date of birth
      if (!fields.dob && dobRegex.test(line)) {
        if (
          line.toLowerCase().includes('birth') ||
          line.toLowerCase().includes('dob') ||
          line.toLowerCase().includes('born')
        ) {
          const dobMatch = line.match(dobRegex);
          if (dobMatch) fields.dob = dobMatch[1];
        }
      }

      // Extract country
      if (!fields.country && countryRegex.test(line)) {
        const countryMatch = line.match(countryRegex);
        if (countryMatch) fields.country = countryMatch[1];
      }

      // Extract gender from explicit markers
      if (!fields.gender) {
        if (line.match(/\b(male|m)\b/i)) fields.gender = 'Male';
        if (line.match(/\b(female|f)\b/i)) fields.gender = 'Female';
      }
    }

    return fields;
  }

  async terminateWorker() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}
