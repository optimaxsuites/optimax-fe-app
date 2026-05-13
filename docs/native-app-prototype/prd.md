# Native App PRD

## Product
Optimax Enterprise Mobile

## Purpose
Design a native-feeling mobile app that unifies Dashboard, Expense, and HR Attendance into one daily-use employee product. The mobile experience should reduce admin friction, improve decision speed, and give staff a fast path for the actions they perform most often away from a desktop.

## Problem Statement
- Current web modules are broad, desktop-oriented, and operationally useful, but they do not yet present a tightly integrated mobile-first workflow for daily employee use.
- Employees need faster access to approvals, expense capture, attendance actions, and personal work signals.
- Managers need a clearer mobile summary of business health, pending actions, exceptions, and team responsiveness.

## Goals
- Deliver a mobile experience that feels native on iOS and Android rather than a shrunk web dashboard.
- Reduce time-to-action for the most frequent tasks: submit expense, approve claim, clock in or out, review attendance issues.
- Surface high-signal operational insight without overwhelming the user.
- Support both individual contributors and line managers in one coherent app shell.

## Non-Goals
- Rebuild every ERP module for mobile in phase one.
- Replicate the full desktop reporting surface.
- Introduce deep configuration, master data management, or heavy admin setup in the first mobile release.

## Primary Users
- Employee: submits expenses, clocks in and out, checks schedule, reviews personal status.
- Manager: approves claims, reviews attendance exceptions, monitors team activity and KPIs.
- Executive or operational lead: monitors top metrics, business health, and pending approvals.

## Core User Jobs
- As an employee, I want to submit an expense from a receipt in under two minutes.
- As an employee, I want to clock in or out quickly and confirm my attendance status immediately.
- As a manager, I want to review approvals and exceptions from a single mobile queue.
- As a leader, I want to open the app and see whether revenue, spend, approvals, and workforce attendance are on track.

## Experience Principles
- Native first: large touch targets, bottom navigation, safe-area spacing, gesture-friendly layouts, fast transitions.
- High signal: every screen should answer “what needs my attention now?”
- Progressive detail: summary first, drill-down second.
- Policy-aware: show compliance status early, not after submission failure.
- Enterprise calm: trustworthy visual language, clear states, restrained alerts, legible data.

## Information Architecture
- Dashboard
- Expense
- HR
- Reports
- More

## Module Scope

### Dashboard
- Personalized greeting and organization switcher
- KPI summary cards
- Spend or business health visualization
- Pending approvals queue
- Quick actions for expense, approval, and attendance
- Team pulse or anomaly snapshot for managers

### Expense
- Capture receipt from camera or upload
- Draft, submitted, approved, reimbursed, rejected states
- Claim detail with category, policy status, attachments, mileage, notes
- Submission progress and reimbursement timeline
- Policy tips and compliance warnings

### HR Attendance
- Clock in, break, and clock out
- Current shift status
- Weekly attendance trend
- Upcoming shifts or schedule view
- Leave balance snapshot
- Attendance exceptions and late or missed punch alerts

## Functional Requirements

### Shared Shell
- Secure sign-in with remembered session and device trust handling
- Bottom tab navigation with role-aware visibility
- Push notifications for approvals, reimbursement updates, and attendance exceptions
- Search and notification center
- Offline-friendly caching for recent receipts, attendance status, and dashboard summary

### Dashboard
- Show user-specific summary cards on launch
- Display pending items with direct deep-link actions
- Allow period filtering on top metrics
- Support role-aware widgets so executives, managers, and employees see different priorities

### Expense
- Support scan, import, and manual claim creation
- Pre-fill merchant, date, and amount when OCR succeeds
- Show policy compliance before final submission
- Support attachment preview and multi-receipt claims
- Preserve draft state if the user leaves the flow

### HR Attendance
- Support clock-in validation with time, shift, and optional location context
- Display today’s schedule and weekly trend
- Surface exceptions with reason and next action
- Allow leave-request shortcut from attendance context

## UX Requirements
- Key actions available within one thumb zone on primary screens
- First meaningful content within two seconds on a healthy network
- No critical action should require more than three taps from a primary tab landing page
- Charts must be interpretable at mobile size
- Use clear status chips for compliance, reimbursement, leave, and attendance states

## Success Metrics
- Expense submission completion rate
- Median time to submit an expense
- Daily active use among eligible employees
- Approval turnaround time
- Attendance action success rate
- Reduction in attendance exception resolution time

## Risks
- Overloading the dashboard with too many desktop metrics
- Poor OCR accuracy creating distrust in expense submission
- Attendance flows becoming brittle if device permissions or connectivity fail
- Cross-role complexity producing inconsistent navigation

## Recommended Design Direction
Concept 2, `Guided Momentum`, is the strongest default direction for phase one. It balances executive visibility with employee usability, keeps actions obvious, and feels the most approachable for broad adoption without looking lightweight.

## Concept Summary
- Concept 1, Executive Clarity: strongest for leadership visibility and polished KPI storytelling.
- Concept 2, Guided Momentum: strongest for daily-use employee flow and guided task completion.
- Concept 3, Precision Workspace: strongest for operations-heavy users who want dense insight and structured controls.

## Delivery Recommendation
Phase one should combine:
- Concept 2 navigation and task framing
- Concept 1 executive dashboard polish
- Select Concept 3 data cards for manager-specific drill-down screens
