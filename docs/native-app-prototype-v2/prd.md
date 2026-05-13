# Native App PRD V2

## Product
OptimaX Suites Native App

## Objective
Create a native-feeling phone and tablet product that mirrors the real OptimaX Suites frontend structure already present in `optimax_fe_app`, with focused mobile adaptations for Dashboard, Expenses, HR Attendance, and Collaboration.

## Source Alignment
This prototype is intentionally based on the current frontend surface in this repo:
- `projects/dashboard`: dashboard metrics, enterprise feed, collaboration workspace, channels, direct messages
- `projects/expense`: expense summary cards, expense table, approvals, filters, analytics, add expense flow
- `projects/hr`: attendance check-in or clock-out, hours worked, expected hours, late minutes, overtime, monthly attendance summary

## Core Requirements
- Mimic existing OptimaX Suites module labels and interaction patterns rather than generic mobile ERP styling.
- Use Nigerian Naira as the default currency across all financial views.
- Support both phones and tablets in the concept set.
- Keep the product enterprise and operational, not consumer-social.
- Preserve the existing frontend mental model: dashboards, tables, approvals, channels, direct messages, feed, check-in, summaries.

## Modules In Scope

### Dashboard
- KPI cards
- branch or business unit filtering
- approvals queue
- expense highlights by employee
- operational summary cards

### Expenses
- Total, Approved, Pending, Rejected summary cards
- Add Expense, Import, Analytics actions
- search and filter row
- expense table cues
- approvals and reimbursement states
- personal versus all employees toggle where relevant

### HR Attendance
- current time and status
- Clock In or Clock Out action
- hours worked
- expected hours
- late minutes
- overtime
- monthly overview and recent attendance summary

### Collaboration
- Collaboration Workspace
- Enterprise Feed
- channel sidebar
- direct messages
- unread counts
- internal post composer
- pinned files or shared items

## Device Strategy

### Phone
- fast approvals
- quick expense actions
- attendance check-in
- compact dashboard snapshot
- direct message and feed consumption

### Tablet
- denser dashboard analytics
- collaboration workspace with side rail
- expense workspace with filters and table
- HR attendance team or manager view

## Names and Data Policy
- Currency is shown in `₦`.
- Employee names should be OptimaX-specific, not generic placeholders.
- For this revision, names were taken from the frontend HR sample employee data already embedded in the app, including `Chukwuemeka Okafor`, `Aisha Abdullahi`, `Babatunde Balogun`, `Maryam Bello`, and `Omotola Adebayo`.
- The live HR `findAllEmployee` endpoint configured in the frontend returned `401 Unauthorized` from this shell without an authenticated session token, so this package does not claim to reflect the tenant’s current live employee roster.

## Design Direction Summary
- Concept 1, `OptimaX Command Center`: best unified suites story across dashboard, collaboration, expenses, and HR in one board.
- Concept 2, `OptimaX Workflow Navigator`: best action flow and clearest task progression across devices.
- Concept 3, `OptimaX Executive Grid`: best analytical and executive-facing option with stronger dashboard density.

## Recommendation
Use Concept 1 as the primary foundation because it best represents the full OptimaX Suites family and most closely communicates “one platform, multiple operational modules.” Borrow Concept 2’s guided expense flow and Concept 3’s denser executive cards for final refinement.
