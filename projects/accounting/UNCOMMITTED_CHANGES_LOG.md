# Uncommitted Changes Log

Generated on 2026-04-13 for the current working tree in `C:\Users\USER\erp-accounting`.

## Summary

The uncommitted changes are centered on the accounting reports refactor and UI restoration work. The main themes are:

- report DTO and service compatibility updates
- restored/styled report UIs for tax summary and cash flow
- rebuilt report component bindings to use DTO-driven data
- added reusable shared report helpers

## Modified Files

### Module and service wiring

- `src/app/app.module.ts`
  Added report shared pieces and module wiring for the report UI work.

- `src/app/core/services/accounting.service.ts`
  Large refactor/compatibility update for report data sourcing, mock/reference data access, and report helper methods.

### Accounting reports workspace

- `src/app/ui/view/accounting-reports/accounting-reports.component.html`
  Updated to render DTO-driven financial statement and cash flow summary content.

- `src/app/ui/view/accounting-reports/accounting-reports.component.scss`
  Styling changes for the accounting reports workspace.

- `src/app/ui/view/accounting-reports/accounting-reports.component.ts`
  Reworked to align with the current report DTO structure and service API.

### Balance sheet report

- `src/app/ui/view/reports/balance-sheet/balance-sheet.component.html`
  Updated report details rendering and balance-sheet page structure.

- `src/app/ui/view/reports/balance-sheet/balance-sheet.component.scss`
  Styling changes for the balance sheet page.

- `src/app/ui/view/reports/balance-sheet/balance-sheet.component.ts`
  Updated to use current DTO names and service methods.

### Cash flow report

- `src/app/ui/view/reports/cash-flow/cash-flow.component.html`
  Restyled with dashboard-style layout, summary cards, direct/indirect method sections, and tax/compliance panels.

- `src/app/ui/view/reports/cash-flow/cash-flow.component.scss`
  New/expanded styling for the restored cash flow presentation.

- `src/app/ui/view/reports/cash-flow/cash-flow.component.ts`
  Updated imports, filtering helpers, and DTO-driven rendering support.

### Income statement

- `src/app/ui/view/reports/income-statement/income-statement.component.ts`
  Refactored to map current income-statement DTOs into the UI-facing structure used by the page.

- `src/app/ui/view/reports/income-statement/income-statement-charts/income-statement-charts.component.html`
  Updated chart card structure and headings.

- `src/app/ui/view/reports/income-statement/income-statement-charts/income-statement-charts.component.scss`
  Updated chart area styling, including the donut-chart presentation.

### Tax summary report

- `src/app/ui/view/reports/tax-summary/tax-summary.component.html`
  Rebuilt into a richer dashboard-style tax reporting layout with overview, VAT, WHT, CIT, PAYE, and filing history sections.

- `src/app/ui/view/reports/tax-summary/tax-summary.component.scss`
  New/expanded styling restoring the richer tax summary presentation.

- `src/app/ui/view/reports/tax-summary/tax-summary.component.ts`
  Added chart config, totals, tab handling, and DTO-based helpers for the restored UI.

## Untracked Files

### New report/shared helpers

- `src/app/core/dtos/report.dto.ts`
  DTO bridge/re-export file for report types.

- `src/app/ui/view/reports/report-context.component.ts`
  Reusable report context/details component.

- `src/app/ui/view/reports/report.dto.ts`
  Report DTO source file currently untracked in this working tree.

- `src/app/ui/view/reports/tax-type-filter.pipe.ts`
  Pipe used to filter tax line items by tax type in templates.

### Other untracked path

- `src/app/ui/sharedComponent/view/pdf-viewer-wrapper/pdf-viewer-wrapper.module.ts`
  PDF viewer wrapper module currently present but untracked.

## Current Git Status Snapshot

Modified:

- `src/app/app.module.ts`
- `src/app/core/services/accounting.service.ts`
- `src/app/ui/view/accounting-reports/accounting-reports.component.html`
- `src/app/ui/view/accounting-reports/accounting-reports.component.scss`
- `src/app/ui/view/accounting-reports/accounting-reports.component.ts`
- `src/app/ui/view/reports/balance-sheet/balance-sheet.component.html`
- `src/app/ui/view/reports/balance-sheet/balance-sheet.component.scss`
- `src/app/ui/view/reports/balance-sheet/balance-sheet.component.ts`
- `src/app/ui/view/reports/cash-flow/cash-flow.component.html`
- `src/app/ui/view/reports/cash-flow/cash-flow.component.scss`
- `src/app/ui/view/reports/cash-flow/cash-flow.component.ts`
- `src/app/ui/view/reports/income-statement/income-statement-charts/income-statement-charts.component.html`
- `src/app/ui/view/reports/income-statement/income-statement-charts/income-statement-charts.component.scss`
- `src/app/ui/view/reports/income-statement/income-statement.component.ts`
- `src/app/ui/view/reports/tax-summary/tax-summary.component.html`
- `src/app/ui/view/reports/tax-summary/tax-summary.component.scss`
- `src/app/ui/view/reports/tax-summary/tax-summary.component.ts`

Untracked:

- `src/app/core/dtos/report.dto.ts`
- `src/app/ui/sharedComponent/view/pdf-viewer-wrapper/pdf-viewer-wrapper.module.ts`
- `src/app/ui/view/reports/report-context.component.ts`
- `src/app/ui/view/reports/report.dto.ts`
- `src/app/ui/view/reports/tax-type-filter.pipe.ts`

## Verification Note

A TypeScript check was run successfully with:

```powershell
npx tsc -p tsconfig.app.json --noEmit
```

The full Angular build was not fully re-verified in this log.
