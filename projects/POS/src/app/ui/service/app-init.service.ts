import { Injectable } from '@angular/core';
import { MetadataService } from './metadata.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppInitService {

  constructor(private metadataService: MetadataService) {}
  async init(): Promise<any>  {
    console.log('AppInitService: initializing...');
    try {
      return await this.metadataService.fetchMetaData();
    } catch {
      return await Promise.resolve();
    };
  }

  
  
}
