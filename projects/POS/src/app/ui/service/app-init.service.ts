import { Injectable } from '@angular/core';
import { MetadataService } from './metadata.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppInitService {

  constructor(private metadataService: MetadataService) {}
  init() {
    console.log('AppInitService: initializing...');
    return this.metadataService.fetchMetaData();
  }
}
