# Integration Guide: Adding Change Requests to Employee Management

## Overview

This guide explains how to integrate the profile change requests system into the existing employee management flow.

## Current State

The employee management component currently displays:
- Basic Information (EmployeeProfileDashboardComponent)
- Next of Kin Information
- Guarantor(s) Information
- Offboarding

## Integration Strategy

### Option 1: Add as New Tab (Recommended)

Replace the leave summary section with profile change requests dashboard.

**File**: `projects/hr/src/app/ui/view/employee-management/employee-management.component.ts`

**Current Code** (lines 33-38):
```typescript
tabsConfig: TabConfig[] = [
  { name: 'Basic Information', component: EmployeeProfileDashboardComponent },
  { name: 'Next of Kin Information', component: EmployeeNokComponent },
  { name: 'Guarantor(s) Information', component: EmployeeGuarantorComponent },
  { name: 'Offboarding', component: EmployeeOffboardingComponent },
];
```

**Updated Code**:
```typescript
tabsConfig: TabConfig[] = [
  { name: 'Basic Information', component: EmployeeProfileDashboardComponent },
  { name: 'Next of Kin Information', component: EmployeeNokComponent },
  { name: 'Guarantor(s) Information', component: EmployeeGuarantorComponent },
  { name: 'Offboarding', component: EmployeeOffboardingComponent },
  { name: 'Profile Changes', component: EmployeeChangeRequestsDashboardComponent },
];
```

**Steps**:

1. Import the component:
```typescript
import { EmployeeChangeRequestsDashboardComponent } from '../profile-change-requests/employee-change-requests-dashboard/employee-change-requests-dashboard.component';
```

2. Add to tabsConfig array

3. The component is already registered in app.module.ts

### Option 2: Standalone Tab Page

Create a separate page accessible from employee profile.

**File**: `projects/hr/src/app/app-routing.module.ts`

**Add Route**:
```typescript
{
  path: 'employee/:id/change-requests',
  component: EmployeeChangeRequestsDashboardComponent
}
```

**Add Link in Employee View**:
```html
<a [routerLink]="['/admin/hr/employee', employee.id, 'change-requests']" class="btn">
  View Change Requests
</a>
```

### Option 3: Inline in Dashboard

Add profile changes section directly to employee profile dashboard.

**File**: `projects/hr/src/app/ui/view/employee-dashboard/employee-profile-dashboard.component.html`

**Add HTML**:
```html
<div class="profile-changes-section">
  <h3>Profile Changes</h3>
  <app-employee-change-requests-dashboard></app-employee-change-requests-dashboard>
</div>
```

## Implementation Steps

### Step 1: Update Tab Configuration

In `employee-management.component.ts`, update the tabsConfig:

```typescript
// Add import at top
import { EmployeeChangeRequestsDashboardComponent } from '../profile-change-requests/employee-change-requests-dashboard/employee-change-requests-dashboard.component';

// In ngOnInit or property initialization
tabsConfig: TabConfig[] = [
  { name: 'Basic Information', component: EmployeeProfileDashboardComponent },
  { name: 'Next of Kin Information', component: EmployeeNokComponent },
  { name: 'Guarantor(s) Information', component: EmployeeGuarantorComponent },
  { name: 'Offboarding', component: EmployeeOffboardingComponent },
  { name: 'Profile Changes', component: EmployeeChangeRequestsDashboardComponent },
];
```

### Step 2: Update Template

In `employee-management.component.html`, ensure tabsConfig is used:

```html
<!-- If using PrimeNG Tabs -->
<p-tabView>
  <p-tabPanel *ngFor="let tab of tabsConfig" [header]="tab.name">
    <ng-component [ngComponentOutlet]="tab.component"></ng-component>
  </p-tabPanel>
</p-tabView>
```

### Step 3: Handle Employee Context

Update EmployeeChangeRequestsDashboardComponent to accept employee ID:

**File**: `employee-change-requests-dashboard.component.ts`

```typescript
export class EmployeeChangeRequestsDashboardComponent implements OnInit {
  @Input() employeeId: number; // Add this
  
  ngOnInit(): void {
    if (this.employeeId) {
      // Filter requests for specific employee
      this.loadMyRequests();
    }
  }
  
  private loadMyRequests(): void {
    // Filter by this.employeeId instead of current employee
    const allRequests = this.getRequestsFromLocalStorage();
    this.myRequests = allRequests.filter(req => req.employeeId === this.employeeId);
  }
}
```

**Template Usage**:
```html
<app-employee-change-requests-dashboard [employeeId]="selectedEmployee.id"></app-employee-change-requests-dashboard>
```

### Step 4: Share Employee Data

Pass employee profile data to the form component:

**In Component**:
```typescript
export class EmployeeChangeRequestsDashboardComponent implements OnInit {
  @Input() employeeData: any; // Add this
  
  ngOnInit(): void {
    if (this.employeeData) {
      // Store employee data for form use
      this.saveEmployeeData(this.employeeData);
    }
    this.loadMyRequests();
  }
  
  private saveEmployeeData(data: any): void {
    localStorage.setItem('employeeProfile', JSON.stringify({
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      phone: data.phone,
      email: data.email
    }));
  }
}
```

### Step 5: Add Navigation

Add link from HR dashboard to manage requests:

**In HR Menu or Sidebar**:
```html
<a routerLink="/admin/hr/profile-change-requests" class="menu-item">
  <i class="fa-solid fa-file-contract"></i>
  Profile Change Requests
</a>
```

## Data Synchronization

### Option A: Real-time Sync (Recommended)

Use RxJS Subject to sync between employee view and change requests:

```typescript
// Create a service
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EmployeeDataService {
  private employeeData = new BehaviorSubject<any>(null);
  
  setEmployeeData(data: any): void {
    this.employeeData.next(data);
  }
  
  getEmployeeData() {
    return this.employeeData.asObservable();
  }
}
```

**In Employee Management Component**:
```typescript
constructor(private employeeDataService: EmployeeDataService) {}

onEmployeeSelected(employee: any): void {
  this.employeeDataService.setEmployeeData(employee);
}
```

**In Change Requests Component**:
```typescript
constructor(
  private employeeDataService: EmployeeDataService,
  private messageService: MessageService
) {}

ngOnInit(): void {
  this.employeeDataService.getEmployeeData().subscribe(employee => {
    if (employee) {
      this.saveEmployeeData(employee);
    }
  });
  this.loadMyRequests();
}
```

### Option B: Property Binding

Use component Input/Output:

```html
<!-- Parent -->
<app-employee-change-requests-dashboard 
  [employeeData]="selectedEmployee"
  [employeeId]="selectedEmployee?.id"
  (requestSubmitted)="onRequestSubmitted($event)">
</app-employee-change-requests-dashboard>
```

## Migration Checklist

- [ ] Import EmployeeChangeRequestsDashboardComponent
- [ ] Add component to app.module.ts (already done)
- [ ] Update tabsConfig in employee-management.component.ts
- [ ] Update employee-management.component.html template
- [ ] Add @Input employeeId to dashboard component
- [ ] Add @Input employeeData to dashboard component
- [ ] Create EmployeeDataService if using real-time sync
- [ ] Add route to profile change requests (optional)
- [ ] Add menu link to HR dashboard (optional)
- [ ] Update employee profile data context
- [ ] Test form with employee data pre-filled
- [ ] Test approval/rejection workflow
- [ ] Verify notifications appear
- [ ] Test responsive layout
- [ ] Update documentation

## Testing the Integration

### Test 1: Data Pre-filling

1. Open employee profile
2. Navigate to Profile Changes tab
3. Verify current bank details are pre-filled
4. Verify they are disabled (read-only)

### Test 2: Form Submission

1. Fill in bank change form
2. Submit request
3. Verify in HR dashboard
4. Approve request
5. Verify status updates in employee view

### Test 3: Multiple Employees

1. View employee A's profile
2. Submit a request
3. Switch to employee B
4. Verify requests are filtered correctly

### Test 4: Navigation

1. From HR dashboard, click employee
2. Navigate to Profile Changes tab
3. Submit request
4. Go back to HR dashboard
5. See request in pending list

## Routing Examples

### Example 1: Tab-based Access

```
/admin/hr/employee/{id}
  └─ Tab: Profile Changes
```

### Example 2: Dedicated Page

```
/admin/hr/employee/{id}/change-requests
```

### Example 3: HR Management

```
/admin/hr/profile-change-requests
  └─ View all employee requests
```

## Component Communication

### Flow Diagram

```
Employee Management
├── Select Employee
├── EmployeeChangeRequestsDashboard
│   ├── Load employee data
│   ├── Show statistics
│   └── BankDetailsChangeRequest
│       ├── Pre-fill current bank
│       └── Submit request
└── Request stored in localStorage

HR Dashboard
├── Load all requests
├── ProfileChangeRequests
│   ├── Display pending
│   ├── Approve/Reject
│   └── Update localStorage
```

## Error Handling

### Handle Missing Employee Data

```typescript
private loadMyRequests(): void {
  const employeeId = this.employeeId || this.getCurrentEmployeeId();
  
  if (!employeeId) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Employee ID not found',
      life: 5000
    });
    return;
  }
  
  // Load requests...
}
```

### Handle Data Sync Issues

```typescript
private saveEmployeeData(data: any): void {
  try {
    if (!data) {
      throw new Error('No employee data provided');
    }
    
    localStorage.setItem('employeeProfile', JSON.stringify({
      bankName: data.bankName || '',
      accountNumber: data.accountNumber || ''
    }));
  } catch (error) {
    console.error('Error saving employee data:', error);
    this.messageService.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Could not pre-fill current bank details',
      life: 5000
    });
  }
}
```

## Performance Considerations

- Lazy load component when tab is selected
- Cache employee data
- Debounce search input
- Use trackBy in *ngFor loops
- Unsubscribe from observables in ngOnDestroy

## Next Steps

1. Choose integration option (recommend Option 1)
2. Follow implementation steps
3. Run through testing checklist
4. Update documentation
5. Deploy to development environment
6. Gather user feedback
7. Iterate and refine

## Support

For questions or issues:
1. Review code comments
2. Check implementation documentation
3. Review quick start guide
4. Check component TypeScript files

---

**Integration Status**: Ready for implementation

**Complexity**: Medium (1-2 hours)

**Risk Level**: Low (no changes to existing code, only additions)

**Testing Required**: Moderate (integration tests)
