# Employee DTO Pattern in ERP-HR System

## Overview

The ERP-HR system uses a **hybrid approach**: Keep `employeeId: number` for database queries while including full `employee: employeeDTO` for rich contextual information. This gives you both performance (direct ID access) and convenience (no extra lookups).

---

## Core Pattern: employeeId + employee

**Simple Rule**: Include both database ID and full employee object

```typescript
// ✅ RECOMMENDED: Database ID + Full object
interface AttendanceRecordDTO {
  employeeId: number;      // For: DB queries, API calls, filtering by ID
  employee: employeeDTO;   // For: Name, email, department, branch, role info
  branchCode: string;
  workDate: string;
  clockInTime?: string;
}

// Access pattern
record.employeeId          // 123 (use for database operations)
record.employee.firstName  // "John" (use for display)
record.employee.email      // "john@company.com" (use for notifications)
```

---

## Why Both Fields?

| Use Case | Best Field |
|----------|-----------|
| Database queries | `employeeId` |
| API filters | `employeeId` |
| Display in UI | `employee.firstName` + `employee.lastName` |
| Get department | `employee.department` |
| Check branch assignment | `employee.primaryBranchId` |
| Send email | `employee.email` |
| Audit trail | `employeeId` (stable reference) |

---

## What EmployeeDTO Contains

**File**: `src/app/ui/domain/employee.dto.ts`

```typescript
interface employeeDTO {
  // Identification (via ID in object reference)
  // Note: Use object as reference if ID not explicitly defined

  // Personal Information
  firstName?: string;       // e.g., "John"
  lastName?: string;        // e.g., "Doe"
  email?: string;           // e.g., "john.doe@company.com"
  workEmail?: string;       // e.g., "john.doe@work.com"
  phone?: string;           // Contact number
  
  // Employment
  jobTitle?: string;        // e.g., "Senior Developer"
  department?: string;      // e.g., "Engineering"
  level?: string;           // e.g., "Level 5"
  supervisor?: string;      // Direct supervisor name

  // Branch Assignment
  primaryBranchId?: number; // Home branch (main work location)
  assignedBranches?: number[]; // All branches employee can work at

  // ... additional fields (banking, identification, leave, etc.)
}
```

---

## Usage in Attendance Module

### AttendanceEventDTO
```typescript
interface AttendanceEventDTO {
  id?: number;
  source: EventSource;       // BIOMETRIC | REMOTE
  eventType: EventType;      // IN | OUT
  
  // ✅ Employee reference (both ID and object)
  employeeId: number;        // For: DB operations, API queries
  employee: employeeDTO;     // For: Display, context, details
  
  branchCode: string;        // Branch where event occurred
  eventTime: string;         // When check-in/out happened
  processed: boolean;        // Processing status
}
```

**Usage Example:**
```typescript
// Save to database
this.http.post('/api/events', {
  employeeId: event.employeeId,  // Use ID for DB
  eventTime: event.eventTime
});

// Display in UI
<div>{{ event.employee?.firstName }} {{ event.employee?.lastName }}</div>
<div>Department: {{ event.employee?.department }}</div>
```

### AttendanceRecordDTO
```typescript
interface AttendanceRecordDTO {
  id?: number;
  
  // ✅ Employee information (ID + full object)
  employeeId: number;        // For: Database lookups, filtering
  employee: employeeDTO;     // For: Name, email, department, branch
  branchCode: string;        // Branch for this record
  
  // Date & time
  workDate: string;          // YYYY-MM-DD
  clockInTime?: string;      // YYYY-MM-DD HH:mm:ss
  clockOutTime?: string;     // YYYY-MM-DD HH:mm:ss
  
  // Metrics & status
  totalHours?: number;
  lateMinutes?: number;
  status: RecordStatus;
  approvalStatus?: ApprovalStatus;
}
```

---

## Usage in Shift & Schedule Module

### ScheduleDTO
```typescript
interface ScheduleDTO {
  id?: number;
  
  // ✅ Employee reference (both ID and object)
  employeeId: number;        // For: DB operations, schedule lookup
  employee: employeeDTO;     // For: Name, email, department
  
  // Shift details
  shiftId: number;           // Which shift template
  startDate: string;         // Assignment start
  endDate?: string;          // Assignment end (null = open-ended)
  notes?: string;            // Optional notes
}
```

### ShiftAssignmentResponse
```typescript
interface ShiftAssignmentResponse {
  scheduleId: number;        // Created/updated assignment ID
  
  // ✅ Employee information (both ID and object)
  employeeId: number;        // For: API responses, database references
  employee: employeeDTO;     // For: Display, confirmations
  
  // Shift information
  shiftName: string;         // Name of assigned shift
  startDate: string;         // Start of assignment
  endDate?: string;          // End of assignment
  status: 'ACTIVE' | 'EXPIRED' | 'FUTURE';
}
```

---

## Usage in Cross-Branch Module

### CrossBranchCheckInRequest
```typescript
interface CrossBranchCheckInRequest {
  id: string;
  createdAt: string;
  
  // ✅ Employee reference (both ID and object)
  employeeId: number;        // For: Database tracking
  employee: employeeDTO;     // For: Display, notifications, home branch
  
  // Branch info (backend uses branch codes, not numeric IDs)
  homeBranchCode: string;
  homeBranchName?: string;
  requestedBranchCode: string; // Where they checked in
  requestedBranchName?: string;
  
  // Request details
  reason: string;            // "Employee checked in at different branch"
  supervisorApprovalStatus: ApprovalStatus;
  
  // Audit
  auditLog: AuditLogEntryDTO[];
}
```

**Usage Example:**
```typescript
// Check if cross-branch
const isCrossBranch = request.homeBranchCode !== request.requestedBranchCode;

// Log audit trail
const auditEntry = {
  actor: { id: userId, name: userName, role: userRole },
  action: 'APPROVED',
  timestamp: new Date().toISOString(),
  details: `Approved for ${request.employee?.firstName} ${request.employee?.lastName}`
};
```

---

## Common Operations

### Get Employee for Database Query
```typescript
const id = record.employeeId;  // 123
this.http.get(`/api/employee/${id}`);  // Use ID for queries
```

### Display Full Name
```typescript
const fullName = `${record.employee?.firstName} ${record.employee?.lastName}`;
// "John Doe"
```

### Check Home Branch
```typescript
const homeBranchId = record.employee?.primaryBranchId;
const isCrossBranch = record.branchCode !== getCodeFromId(homeBranchId);
```

### Send Notification
```typescript
const email = record.employee?.email;
const name = record.employee?.firstName;
this.emailService.send(email, `Hello ${name}, your attendance was recorded.`);
```

### Filter by Department
```typescript
records.filter(r => r.employee?.department === 'Engineering');
```

### Group by Supervisor
```typescript
const grouped = groupBy(records, r => r.employee?.supervisor);
```

### Build Report
```typescript
const report = records.map(r => ({
  id: r.employeeId,              // Database ID
  name: r.employee?.firstName,   // Display name
  email: r.employee?.email,      // Contact
  department: r.employee?.department, // Organization
  hoursWorked: r.totalHours      // Metric
}));
```

---

## Best Practices

### ✅ DO:

1. **Always include both fields**
   ```typescript
   interface Record {
     employeeId: number;    // ✅ Database reference
     employee: employeeDTO; // ✅ Full information
   }
   ```

2. **Use ID for database operations**
   ```typescript
   // Good: Direct ID for database queries
   this.http.get(`/api/attendance/${record.employeeId}`);
   ```

3. **Use object for display/context**
   ```typescript
   // Good: Object fields for UI
   <div>{{ record.employee?.firstName }} {{ record.employee?.lastName }}</div>
   ```

4. **Use optional chaining in templates**
   ```typescript
   // Good: Safe access
   {{ record.employee?.department }}  // Won't break if undefined
   ```

5. **Keep ID stable for audit trails**
   ```typescript
   // Good: ID doesn't change, employee object might get updated
   auditLog.push({
     actor: userId,           // Use ID, not name
     action: 'APPROVED',
     targetId: record.employeeId  // Use ID for audit
   });
   ```

### ❌ DON'T:

1. **Don't use employee object for database operations**
   ```typescript
   // Bad: Object is not stable identifier
   this.http.get(`/api/attendance?name=${record.employee?.firstName}`);
   
   // Good: Use ID
   this.http.get(`/api/attendance/${record.employeeId}`);
   ```

2. **Don't scatter employee fields**
   ```typescript
   // Bad: Duplicate info, data consistency issues
   employeeId: number;
   employeeName: string;
   employeeEmail: string;
   
   // Good: Keep all in object
   employee: employeeDTO;
   ```

3. **Don't make employee required if optional**
   ```typescript
   // Bad: If you might not have it, make optional
   employee: employeeDTO;  // ❌ If truly required only
   
   // Good: Mark as optional if might be missing
   employee?: employeeDTO; // ✅ If can be missing
   ```

4. **Don't expose raw IDs in UI without context**
   ```typescript
   // Bad: User sees "123" (meaningless)
   <td>{{ record.employeeId }}</td>
   
   // Good: Use employee info for display
   <td>{{ record.employee?.firstName }} {{ record.employee?.lastName }}</td>
   ```

---

## Performance Considerations

| Operation | Best Approach |
|-----------|---------------|
| Database query | Use `employeeId` directly |
| Display list | Fetch with `employee` included |
| Detail view | `employee` already loaded |
| Bulk export | Include both fields |
| Sending email | Use `employee.email` |
| Audit logging | Store `employeeId` |

**Recommendation:**
- Include `employee` in all API responses (sent once, used many times)
- Use `employeeId` for any database filtering/querying
- Avoid re-fetching employee data if already included

---

## Summary: Both Fields Work Together

```typescript
// ✅ FINAL PATTERN: The best of both worlds
{
  // Database reference (stable, queryable, minimal)
  employeeId: number;
  
  // Rich information (display, context, notifications)
  employee: employeeDTO;
}

// This gives you:
// - Performance: Direct ID for queries
// - Convenience: No extra lookups for display
// - Consistency: Single source of truth for employee data
// - Type Safety: Full TypeScript support
```

---

## Migration from Scattered Fields

### Before (Problematic)
```typescript
{
  employeeId: number;      // Database ID
  employeeName?: string;   // Might be stale
  employeeEmail?: string;  // Might be stale
  // ... scattered fields, data consistency issues
}
```

### After (Clean)
```typescript
{
  employeeId: number;      // Database ID (for queries)
  employee: employeeDTO;   // All info (name, email, etc.)
  // Single source of truth, always current
}
```

---

## Related Files

- **Employee DTO**: [../employee.dto.ts](../employee.dto.ts)
- **Attendance Events**: [./attendance-event.dto.ts](./attendance-event.dto.ts)
- **Shift Schedules**: [./shifts-schedule.dto.ts](./shifts-schedule.dto.ts)
- **Cross-Branch**: [./cross-branch-request.dto.ts](./cross-branch-request.dto.ts)

---

**Last Updated**: 2026-09-01  
**Pattern Status**: Active - All attendance/shift DTOs updated  
**Best Practice**: Always include both `employeeId: number` and `employee: employeeDTO`

