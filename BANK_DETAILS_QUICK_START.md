# Bank Details Change Request - Quick Start Guide

## Quick Overview

This implementation provides a complete workflow for employees to request profile changes (bank details) and for HR to manage these requests.

## Files Created/Modified

### New Files
```
✓ projects/hr/src/app/ui/service/nigerian-banks.service.ts
✓ projects/hr/src/app/ui/view/profile-change-requests/
  ├── profile-change-requests.component.ts (updated)
  ├── profile-change-requests.component.html
  ├── profile-change-requests.component.scss
  ├── bank-details-change-request/
  │   ├── bank-details-change-request.component.ts
  │   ├── bank-details-change-request.component.html
  │   └── bank-details-change-request.component.scss
  └── employee-change-requests-dashboard/
      ├── employee-change-requests-dashboard.component.ts
      ├── employee-change-requests-dashboard.component.html
      └── employee-change-requests-dashboard.component.scss
✓ BANK_CHANGE_REQUEST_IMPLEMENTATION.md (this project documentation)
```

### Modified Files
```
✓ projects/hr/src/app/app.module.ts (added imports and declarations)
✓ projects/hr/src/app/ui/service/models/profile-change-request.model.ts (already existed)
```

## Component Usage

### 1. Employee Form (Insert in Employee Dashboard)

```html
<app-bank-details-change-request 
  (requestSubmitted)="onRequestSubmitted($event)">
</app-bank-details-change-request>
```

### 2. Employee Dashboard (Full View)

```html
<app-employee-change-requests-dashboard></app-employee-change-requests-dashboard>
```

### 3. HR Management View

```html
<app-profile-change-requests></app-profile-change-requests>
```

## How It Works

### Employee Workflow

1. **Submit Request**
   - Click "Submit New Request" button
   - Select new bank from searchable dropdown
   - Enter new 10-digit account number
   - Confirm account number
   - Provide reason for change (min 10 characters)
   - Click "Submit Request"

2. **Track Status**
   - View statistics (Total, Pending, Approved, Rejected)
   - See pending requests with current status
   - View approved requests
   - See rejected requests with rejection reason
   - Click "View Details" for more information

3. **Request Details**
   - Modal shows all request information
   - Old value → New value comparison
   - Current status
   - Dates and approver information

### HR Workflow

1. **Review Requests**
   - View all pending requests in table
   - See employee ID, change type, old/new values
   - Submitted date and reason

2. **Approve Request**
   - Click approve button (✓)
   - Confirm in dialog
   - Request marked as approved
   - Employee notified

3. **Reject Request**
   - Click reject button (✗)
   - Provide rejection reason (min 10 characters)
   - Request marked as rejected
   - Employee can see reason and resubmit

## Data Storage

### Using Local Storage (Temporary)

Data is stored in browser's local storage for development:

```typescript
// Get all requests
const requests = JSON.parse(localStorage.getItem('profileChangeRequests') || '[]');

// Get employee profile
const profile = JSON.parse(localStorage.getItem('employeeProfile') || '{}');

// Get employee ID
const empId = localStorage.getItem('employeeId');
```

### Initialize Test Data

```typescript
// Add to browser console to set up test data
localStorage.setItem('employeeId', '1001');
localStorage.setItem('employeeProfile', JSON.stringify({
  bankName: 'Zenith Bank',
  accountNumber: '1234567890'
}));
```

## Key Features

### Form Validation
- ✓ Real-time validation
- ✓ Account number format (10 digits)
- ✓ Confirmation field matching
- ✓ Reason length validation
- ✓ Error messages

### Status Management
- ✓ Pending (yellow)
- ✓ Approved (green)
- ✓ Rejected (red)

### User Experience
- ✓ Loading states
- ✓ Toast notifications
- ✓ Confirmation dialogs
- ✓ Modal details view
- ✓ Empty states
- ✓ Responsive design

### Data Features
- ✓ Local storage persistence
- ✓ Date formatting
- ✓ CSV export (HR)
- ✓ Filtering by status
- ✓ Search functionality

## Testing the Implementation

### Step 1: Set Up Test Data
```typescript
// In browser console
localStorage.setItem('employeeId', '1001');
localStorage.setItem('employeeProfile', JSON.stringify({
  firstName: 'John',
  lastName: 'Doe',
  bankName: 'Zenith Bank',
  accountNumber: '1234567890'
}));
```

### Step 2: Test Employee Form
1. Navigate to employee dashboard
2. Click "Submit New Request"
3. Fill in form:
   - Bank: Select "Access Bank"
   - Account: 9876543210
   - Confirm: 9876543210
   - Reason: "Switching to better bank rates"
4. Click Submit
5. Verify success notification

### Step 3: Test HR View
1. Navigate to HR Profile Change Requests
2. Should see your request in Pending section
3. Click Approve (✓) button
4. Confirm approval
5. Request moves to Processed section

### Step 4: Test Rejection
1. Create another request
2. In HR view, click Reject (✗)
3. Enter rejection reason
4. Request moves to Processed as Rejected
5. Back to employee view, should see rejection reason

## API Integration (Future)

Replace local storage with HTTP calls:

```typescript
// In component
constructor(private changeRequestService: ChangeRequestService) {}

// Submit request
this.changeRequestService.submitRequest(request).subscribe(
  response => {
    // Handle success
  },
  error => {
    // Handle error
  }
);

// Get requests
this.changeRequestService.getMyRequests().subscribe(
  requests => {
    this.myRequests = requests;
  }
);
```

## Styling Customization

### Color Classes
- `.badge-warning` - Pending (yellow)
- `.badge-success` - Approved (green)
- `.badge-danger` - Rejected (red)
- `.badge-info` - Bank change (blue)

### Update Colors
Edit SCSS files to change:
```scss
$primary: #3498db;
$success: #27ae60;
$warning: #f39c12;
$danger: #e74c3c;
```

## Troubleshooting

### Form Not Validating
- Check browser console for errors
- Verify form is dirty/touched before showing errors
- Check FormGroup has all required validators

### Banks Dropdown Empty
- Verify NigerianBanksService is injected
- Check `getBanks()` returns array
- Verify AutoCompleteModule is imported

### Requests Not Persisting
- Check localStorage is enabled
- Verify localStorage keys are correct
- Check browser storage size limits

### Styling Issues
- Clear browser cache
- Rebuild Angular project
- Check SCSS compilation

## Browser Compatibility

Works on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Tips

- Use pagination for large request lists
- Lazy load bank list
- Debounce search input
- Cache employee profile
- Use trackBy in *ngFor loops

## Next Steps

1. **Backend Integration**
   - Create API endpoints
   - Replace localStorage with HTTP calls
   - Add authentication

2. **Additional Request Types**
   - Emergency contact
   - Address change
   - Phone number
   - NOK information
   - Guarantor details

3. **Advanced Features**
   - Multi-level approval
   - Email notifications
   - Document uploads
   - Audit trail
   - Analytics

4. **Testing**
   - Write unit tests
   - Add E2E tests
   - Performance testing

## Support & Documentation

- Full documentation: See `BANK_CHANGE_REQUEST_IMPLEMENTATION.md`
- Component code comments for implementation details
- Service documentation in Nigerian banks service

## Questions?

Review the implementation files for detailed comments and documentation on each component and service.
