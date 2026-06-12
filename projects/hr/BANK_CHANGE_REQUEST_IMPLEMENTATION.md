# Bank Details Change Request Implementation

## Overview
This implementation provides a complete system for employees to request profile changes (starting with bank details) and for HR to review and manage these requests. The system uses local storage as a temporary data store until backend endpoints are ready.

## Project Structure

```
projects/hr/src/app/
├── ui/
│   ├── service/
│   │   ├── nigerian-banks.service.ts          # Nigerian banks data service
│   │   └── models/
│   │       └── profile-change-request.model.ts # DTO interfaces
│   └── view/
│       └── profile-change-requests/
│           ├── profile-change-requests.component.ts/html/scss     # HR view (manage requests)
│           ├── bank-details-change-request/
│           │   ├── bank-details-change-request.component.ts/html/scss   # Employee form
│           └── employee-change-requests-dashboard/
│               └── employee-change-requests-dashboard.component.ts/html/scss  # Employee dashboard
└── app.module.ts                               # Module declarations
```

## Components

### 1. BankDetailsChangeRequestComponent
**Location**: `bank-details-change-request/`
**Purpose**: Form for employees to submit bank details change requests

**Features**:
- Nigerian banks dropdown (searchable AutoComplete)
- Account number validation (10 digits)
- Reason for change textarea
- Account number confirmation field
- Form validation with error messages
- Local storage persistence

**Inputs/Outputs**:
- `@Output requestSubmitted`: Emits ProfileChangeRequestDTO when form is submitted

**Usage**:
```html
<app-bank-details-change-request (requestSubmitted)="onRequestSubmitted($event)"></app-bank-details-change-request>
```

### 2. ProfileChangeRequestsComponent
**Location**: `profile-change-requests/`
**Purpose**: HR dashboard to view, approve, and reject pending requests

**Features**:
- View pending, approved, and rejected requests in separate sections
- Approve requests with confirmation dialog
- Reject requests with reason modal
- View detailed request information
- Export requests to CSV
- Request filtering and statistics

**Methods**:
- `getPendingRequests()`: Returns array of pending requests
- `getProcessedRequests()`: Returns array of approved/rejected requests
- `approveRequest(request)`: Approves a pending request
- `rejectRequest()`: Rejects a request with reason
- `viewRequestDetails(request)`: Opens details modal
- `exportToCSV()`: Exports all requests to CSV file
- `formatDate(date)`: Formats dates to readable format

### 3. EmployeeChangeRequestsDashboardComponent
**Location**: `employee-change-requests-dashboard/`
**Purpose**: Employee view to submit and track their profile change requests

**Features**:
- Statistics cards showing total, pending, approved, rejected requests
- Submit new request form
- View pending requests
- View approved requests
- View rejected requests with rejection reason
- Request history timeline
- Details modal for each request
- Categorized request sections

**Methods**:
- `getPendingRequests()`: Returns pending requests for current employee
- `getApprovedRequests()`: Returns approved requests
- `getRejectedRequests()`: Returns rejected requests
- `viewRequestDetails(request)`: Opens details modal
- `toggleSubmitForm()`: Shows/hides submit form
- `toggleHistory()`: Shows/hides history timeline
- `onRequestSubmitted(request)`: Handles new request submission

## Data Models

### ProfileChangeRequestDTO
```typescript
{
  id?: number;
  employeeId: number;
  requestType: 'delete' | 'change' | 'update' | 'new';
  fieldChangeType: 'bank' | 'emergency_contact' | 'address' | 'phone' | 'email' | 'NOK' | 'guarantor';
  request: RequestDTO[];
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: Date;
  processedDate?: Date;
  processedBy?: any;
  rejectionReason?: string;
}
```

### RequestDTO
```typescript
{
  id?: number;
  fieldName: string;        // 'bankName', 'accountNumber', etc.
  value: string;            // New value
  oldValue: string;         // Current value
}
```

## Services

### NigerianBanksService
**Purpose**: Provides Nigerian banks data and utilities

**Methods**:
- `getBanks(): NigerianBank[]` - Returns all banks
- `getBankByCode(code): NigerianBank | undefined` - Find bank by code
- `getBankByName(name): NigerianBank | undefined` - Find bank by name
- `searchBanks(query): NigerianBank[]` - Search banks
- `validateAccountNumber(accountNumber): boolean` - Validate 10-digit account number

**Banks Included**: 23 major Nigerian banks including:
- Access Bank
- GTBank
- First Bank
- UBA
- Zenith Bank
- And more...

## Local Storage Structure

### profileChangeRequests
Stores array of ProfileChangeRequestDTO objects
```
Key: 'profileChangeRequests'
Value: JSON.stringify(ProfileChangeRequestDTO[])
```

### employeeProfile
Stores current employee profile information
```
Key: 'employeeProfile'
Value: JSON.stringify({ bankName, accountNumber, ... })
```

### employeeId
Stores current employee ID for filtering requests
```
Key: 'employeeId'
Value: employee_id_number
```

## Module Imports

The following PrimeNG modules are imported in `app.module.ts`:
- `AutoCompleteModule` - For bank dropdown
- `ButtonModule` - For buttons
- `DialogModule` - For modals
- `ToastModule` - For notifications
- `ConfirmDialogModule` - For confirmations

## Styling

Both components use SCSS with:
- Responsive design (mobile, tablet, desktop)
- Consistent color scheme
- Font Awesome icons
- PrimeNG component styling

### Color Scheme
- Primary: #3498db (Blue)
- Success: #27ae60 (Green)
- Warning: #f39c12 (Orange)
- Danger: #e74c3c (Red)
- Dark: #2c3e50

## Integration Points

### Employee Dashboard Integration
To add this to the employee management page:
```html
<!-- Replace leave summary with profile change requests dashboard -->
<app-employee-change-requests-dashboard></app-employee-change-requests-dashboard>
```

### Routes (to be added)
```typescript
{
  path: 'profile-change-requests',
  component: ProfileChangeRequestsComponent
},
{
  path: 'my-requests',
  component: EmployeeChangeRequestsDashboardComponent
}
```

## Notifications

Uses PrimeNG MessageService for notifications:
- Success: Request submitted/approved
- Error: Validation failures, API errors
- Warning: Missing required fields
- Info: Processing states

## TODO: Backend Integration

When backend is ready, replace local storage calls with:

### Service Methods to Create
```typescript
// For employee
submitChangeRequest(request: ProfileChangeRequestDTO): Observable<ProfileChangeRequestResponse>
getMyChangeRequests(): Observable<ProfileChangeRequestListResponse>
cancelRequest(requestId: number): Observable<any>

// For HR
getAllChangeRequests(): Observable<ProfileChangeRequestListResponse>
approveRequest(requestId: number): Observable<any>
rejectRequest(requestId: number, reason: string): Observable<any>
```

### Environment Configuration
Add to `environments.ts`:
```typescript
apiEndpoints: {
  changeRequests: '/api/profile-change-requests',
  myRequests: '/api/my-change-requests'
}
```

## Validation Rules

### Bank Details Form
1. **Current Bank Name**: Disabled (read-only)
2. **Current Account Number**: Disabled (read-only)
3. **New Bank Name**: Required, must be from dropdown
4. **New Account Number**: Required, must be exactly 10 digits
5. **Confirm Account Number**: Required, must match New Account Number
6. **Reason**: Required, 10-500 characters

### Server-Side Validation (to implement)
- Verify bank code exists
- Validate NUBAN account format
- Verify employee ID exists
- Check for duplicate pending requests

## Performance Considerations

- Lazy load bank list (currently in memory)
- Debounce bank search input
- Paginate large request lists
- Cache employee profile data
- Consider virtual scrolling for large histories

## Security Considerations

- Validate all user inputs
- Sanitize text inputs
- Implement request rate limiting
- Add approval workflow
- Log all changes for audit trail
- Implement role-based access control

## Testing

### Unit Tests Needed
- Bank validation
- Form validation
- Status filtering
- Date formatting

### E2E Tests Needed
- Submit bank change request
- Approve request as HR
- Reject request with reason
- View request history
- Export to CSV

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Accessibility

- ARIA labels on form fields
- Keyboard navigation support
- Color contrast compliance
- Screen reader friendly

## Future Enhancements

1. Multi-step form wizard for complex changes
2. Document upload support
3. Email notifications
4. Change request templates
5. Batch operations for HR
6. Analytics dashboard
7. Approval workflows with multiple levels
8. API integration for employee data auto-fill
