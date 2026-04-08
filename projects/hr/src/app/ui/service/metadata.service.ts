import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { BehaviorSubject, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MetadataService {
  private genderSubject = new BehaviorSubject<any[]>([]);
  private maritalStatusSubject = new BehaviorSubject<any[]>([]);
  private religionSubject = new BehaviorSubject<any[]>([]);
  private relationshipSubject = new BehaviorSubject<any[]>([]);
  private departmentSubject = new BehaviorSubject<any[]>([]);
  private levelSubject = new BehaviorSubject<any[]>([]);
  private leaveSubject = new BehaviorSubject<any[]>([]);
  private employmentSubject = new BehaviorSubject<any[]>([]);

  gender$ = this.genderSubject.asObservable();
  maritalStatuses$ = this.maritalStatusSubject.asObservable();
  religions$ = this.religionSubject.asObservable();
  nextOfKinRelationships$ = this.relationshipSubject.asObservable();
  departments$ = this.departmentSubject.asObservable();
  levels$ = this.levelSubject.asObservable();
  leaves$ = this.leaveSubject.asObservable();
  employment$ = this.employmentSubject.asObservable();
  
  private metaLoaded = false;
  private metaLoading = false;

  constructor(private dataService: DataService) { }

  ensureMetaLoaded() {
    this.fetchMetaData(false);
  }

  refreshMetaData() {
    this.fetchMetaData(true);
  }

 fetchMetaData(force: boolean) {
    if (this.metaLoaded && !force) return;
    if (this.metaLoading) return;

    this.metaLoading = true;

    forkJoin({
      genders: this.dataService.getGender().pipe(catchError(() => of([]))),
      maritalStatuses: this.dataService.getMaritalStatus().pipe(catchError(() => of([]))),
      religions: this.dataService.getReligion().pipe(catchError(() => of([]))),
      relationships: this.dataService.getRelationship().pipe(catchError(() => of([]))),
      departments: this.dataService.getDepartment().pipe(catchError(() => of([]))),
      levels: this.dataService.getAllLevels().pipe(catchError(() => of([]))),
      leaves: this.dataService.getLeaveTypes().pipe(catchError(() => of([]))),
      jobTypes: this.dataService.getJobType().pipe(catchError(() => of([]))),
    }).subscribe({
      next: (meta) => {
        this.genderSubject.next(meta.genders);
        this.maritalStatusSubject.next(meta.maritalStatuses);
        this.religionSubject.next(meta.religions);
        this.relationshipSubject.next(meta.relationships);
        this.departmentSubject.next(meta.departments);
        this.levelSubject.next(meta.levels);
        this.leaveSubject.next(meta.leaves);
        this.employmentSubject.next(meta.jobTypes);
        this.metaLoaded = true;
        this.metaLoading = false;
      },
      error: () => {
        this.metaLoading = false;
      }
    });
  }
}
