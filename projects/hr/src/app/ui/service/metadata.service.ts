import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { BehaviorSubject } from 'rxjs';

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
  
  constructor(private dataService: DataService) { }

  fetchMetaData() {
    this.dataService.getGender().subscribe(data => this.genderSubject.next(data));
    this.dataService.getMaritalStatus().subscribe(data => this.maritalStatusSubject.next(data));
    this.dataService.getReligion().subscribe(data => this.religionSubject.next(data));
    this.dataService.getRelationship().subscribe(data => this.relationshipSubject.next(data));
    this.dataService.getDepartment().subscribe(data => this.departmentSubject.next(data));
    this.dataService.getAllLevels().subscribe(level => this.levelSubject.next(level));
    this.dataService.getLeaveTypes().subscribe(leave => this.leaveSubject.next(leave));
    this.dataService.getJobType().subscribe(jobType => this.employmentSubject.next(jobType));

  }
}
