import { Component, Input } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core/index.js';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EmployeeService } from '../../../service/employee.service';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-view-employee',
  templateUrl: './view-employee.component.html',
  styleUrl: './view-employee.component.scss'
})
export class ViewEmployeeComponent {
   employeeInView: any; 
  calendarOptions: CalendarOptions = {}
  private readonly allowanceNameCache = new Map<string, Observable<string>>();
  private readonly bonusNameCache = new Map<string, Observable<string>>();
  private readonly deductionNameCache = new Map<string, Observable<string>>();
  private readonly overtimeNameCache = new Map<string, Observable<string>>();
  handleDateClick(arg: DateClickArg) {
    alert('date click! ' + arg.dateStr)
  }

  employeeProfilePhotoUrl: SafeUrl | string = 'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0='

  constructor(private employeeService: EmployeeService, private sanitizer: DomSanitizer, private http: HttpClient){}
  
  ngOnInit(): void {
    const employee = localStorage.getItem("employeeInView");

    if (employee) {
      this.employeeInView = JSON.parse(employee);

      if(this.employeeInView?.level){
        this.employeeService.getSalaryById(this.employeeInView.level.id).subscribe({
          next: data => {
            this.employeeInView.salaryDetails = data[0]
            console.log(this.employeeInView)
            // this.employeeInView.leaveEvents = this.generateLeaveEvents(this.employeeInView.salaryDetails.leaveDetails)
          },
          error: err => console.log(err)
        })

      }
    
    }

  
    this.getEmployeesProfilePhotoUrl(this.employeeInView?.employeeMedia?.mediaNo);

    
    if(this.employeeInView.leaveDetails){
        this.calendarOptions = {
          initialView: 'dayGridMonth',
          plugins: [dayGridPlugin, interactionPlugin],
          dateClick: (arg) => this.handleDateClick(arg),
          events:  this.generateLeaveEvents(this.employeeInView.leaveDetails)
        };
      }    


  }
 getAllowanceName(id: number | string): Observable<string> {
    if (id === null || id === undefined || id === '') return of('Unknown');
    const key = String(id);
    const cached = this.allowanceNameCache.get(key);
    if (cached) return cached;

    const request$ = this.employeeService.getAllowanceTypeById(id as any).pipe(
      map((response: any) => response?.name || 'Unknown'),
      catchError(() => of('Unknown')),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.allowanceNameCache.set(key, request$);
    return request$;
  }

  getBonusName(id: number | string): Observable<string> {
    if (id === null || id === undefined || id === '') return of('Unknown');
    const key = String(id);
    const cached = this.bonusNameCache.get(key);
    if (cached) return cached;

    const request$ = this.employeeService.getBonusTypeById(id as any).pipe(
      map((response: any) => response?.name || 'Unknown'),
      catchError(() => of('Unknown')),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.bonusNameCache.set(key, request$);
    return request$;
  }

  getDeductionName(id: number | string): Observable<string> {
    if (id === null || id === undefined || id === '') return of('Unknown');
    const key = String(id);
    const cached = this.deductionNameCache.get(key);
    if (cached) return cached;

    const request$ = this.employeeService.getDeductionTypeById(id as any).pipe(
      map((response: any) => response?.name || 'Unknown'),
      catchError(() => of('Unknown')),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.deductionNameCache.set(key, request$);
    return request$;
  }

  getOvertimeName(id: number | string): Observable<string> {
    if (id === null || id === undefined || id === '') return of('Unknown');
    const key = String(id);
    const cached = this.overtimeNameCache.get(key);
    if (cached) return cached;

    const request$ = this.employeeService.getOverTimeTypeById(id as any).pipe(
      map((response: any) => response?.name || 'Unknown'),
      catchError(() => of('Unknown')),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.overtimeNameCache.set(key, request$);
    return request$;
  }

  generateLeaveEvents(leaveDetails: { leavesSpent: any[]; }) {
    return leaveDetails.leavesSpent.map(leave => {
      return {
        title: `${leave.type} Leave`,
        start: leave.from,
        end: leave.to,
        backgroundColor:  '#2EB270'   
      };
    });
  }



  toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  getEmployeesProfilePhotoUrl(filename: string){
    this.employeeService.getEmployeeImage(filename).subscribe({
      next: (response) => {
        const blob = new Blob([response], { type: 'image/png' });
        this.employeeProfilePhotoUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
      },
      error: (err) => {
        console.error('Failed to load employee image', err);
           this.employeeProfilePhotoUrl = 'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0=';
      console.log(this.employeeProfilePhotoUrl)
      },
    });
  }
}
