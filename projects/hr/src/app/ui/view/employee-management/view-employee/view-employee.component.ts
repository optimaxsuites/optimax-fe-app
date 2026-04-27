import { Component, Input } from '@angular/core';
import { CalendarOptions } from '@fullcalendar/core/index.js';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EmployeeService } from '../../../service/employee.service';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
@Component({
  selector: 'app-view-employee',
  templateUrl: './view-employee.component.html',
  styleUrl: './view-employee.component.scss'
})
export class ViewEmployeeComponent {
   employeeInView: any; 
  calendarOptions: CalendarOptions = {}
  loading = false;
  private readonly allowanceNameCache = new Map<string, Observable<string>>();
  private readonly bonusNameCache = new Map<string, Observable<string>>();
  private readonly deductionNameCache = new Map<string, Observable<string>>();
  private readonly overtimeNameCache = new Map<string, Observable<string>>();
  handleDateClick(arg: DateClickArg) {
    alert('date click! ' + arg.dateStr)
  }

  employeeProfilePhotoUrl: SafeUrl | string = 'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0='

  constructor(private employeeService: EmployeeService, private sanitizer: DomSanitizer, private http: HttpClient, private messageService: MessageService){}
  
  ngOnInit(): void {
    this.loading = true;
    const employee = localStorage.getItem("employeeInView");

    if (employee) {
      this.employeeInView = JSON.parse(employee);

      console.log(this.employeeInView)

      if(this.employeeInView?.level){
        this.employeeService.getSalaryById(this.employeeInView.level.id).subscribe({
          next: data => {
            this.employeeInView.salaryDetails = data[0]
            this.employeeInView.salaryDetails.netSalary = this.calculateNetSalary(data[0])
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

    this.loading = false;


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

   copyToClipboard(value: string | number | null | undefined, label = 'Value'): void {
    const text = String(value ?? '').trim();
    if (!text) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => this.showCopyToast(label))
        .catch(() => this.fallbackCopy(text, label));
      return;
    }

    this.fallbackCopy(text, label);
  }

  buildTelLink(phone: string | number | null | undefined): string | null {
    const text = String(phone ?? '').trim();
    if (!text) return null;
    const cleaned = text.replace(/[^\d+]/g, '');
    return cleaned ? `tel:${cleaned}` : null;
  }

  buildMailLink(email: string | null | undefined): string | null {
    const text = String(email ?? '').trim();
    if (!text) return null;
    return `mailto:${text}`;
  }

    private fallbackCopy(text: string, label: string): void {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showCopyToast(label);
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Copy failed',
        detail: `${label} could not be copied.`,
        key: 'global',
      });
    }
  }

  private formatDateValue(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  private showCopyToast(label: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Copied',
      detail: `${label} copied to clipboard.`,
      key: 'global',
    });
  }

  formatDate(value: any): string {
    if (!value) return '-';

    if (Array.isArray(value)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = value;
      if (year && month && day) {
        const safeMonth = Math.max(1, Math.min(12, Number(month)));
        const date = new Date(
          Number(year),
          safeMonth - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second)
        );
        if (!Number.isNaN(date.getTime())) {
          return this.formatDateValue(date);
        }
      }
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return this.formatDateValue(parsed);
    }

    return String(value);
  }


  private calculateNetSalary(details: any): number {
    if (!details) return 0;
    const base = this.toNumber(details.baseSalary);
    const allowances = this.sumAmounts(details.allowance, ['amount', 'value']);
    const bonuses = this.sumAmounts(details.bonus, ['amount', 'value']);
    const overtime = this.sumAmounts(details.overtime, ['amount', 'rate', 'value']);
    const deductions = this.sumAmounts(details.deductions, ['amount', 'value']);
    return base + allowances + bonuses + overtime - deductions;
  }

  private sumAmounts(items: any, fields: string[]): number {
    if (!Array.isArray(items)) return 0;
    return items.reduce((total, item) => {
      if (item === null || item === undefined) return total;
      if (typeof item === 'number') return total + item;
      for (const field of fields) {
        const value = this.toNumber(item?.[field]);
        if (value !== 0) return total + value;
      }
      return total + this.toNumber(item);
    }, 0);
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
