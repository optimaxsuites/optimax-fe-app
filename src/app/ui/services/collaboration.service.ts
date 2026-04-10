import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../sharedComponent/service/environments/environment';

// ─────────────────────────────────────────────────────
//  Channel types (matching backend response)
// ─────────────────────────────────────────────────────
export interface CollabChannel {
  id: number;
  channelCode: string;
  name: string;
  description: string;
  channelType: 'PUBLIC' | 'PRIVATE';
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: number;
  createdAt: number[];
}

// ─────────────────────────────────────────────────────
//  Service
// ─────────────────────────────────────────────────────
@Injectable({
  providedIn: 'root',
})
export class CollaborationService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-ID': sessionStorage.getItem('tenantId') || 'default',
      Authorization: `Bearer ${sessionStorage.getItem('token') || ''}`,
    });
  }

  /**
   * GET /x/api/v2/ai/collab/chat/channel
   * Returns all available channels.
   */
  getChannels(): Observable<CollabChannel[]> {
    return this.http.get<CollabChannel[]>(
      `${this.baseUrl}/x/api/v2/ai/collab/chat/channel`,
      { headers: this.headers },
    );
  }
}