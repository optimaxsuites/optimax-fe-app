import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  /**
   * Export data to CSV format
   */
  exportToCSV(data: any[], filename: string, headers?: string[]): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const keys = headers || Object.keys(data[0]);
    const csvContent = this.generateCSV(data, keys);
    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  }

  /**
   * Export data to JSON format
   */
  exportToJSON(data: any[], filename: string): void {
    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, `${filename}.json`, 'application/json');
  }

  /**
   * Export data to TSV (Tab-Separated Values) for Excel
   */
  exportToTSV(data: any[], filename: string, headers?: string[]): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const keys = headers || Object.keys(data[0]);
    const tsvContent = this.generateTSV(data, keys);
    this.downloadFile(tsvContent, `${filename}.tsv`, 'text/tab-separated-values');
  }

  /**
   * Generate printable HTML report
   */
  printReport(title: string, htmlContent: string): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { border-collapse: collapse; width: 100%; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #4CAF50; color: white; }
              h1 { color: #333; }
              .header { page-break-after: avoid; }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${title}</h1>
              <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            ${htmlContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  }

  /**
   * Create attendance summary report
   */
  generateAttendanceSummaryReport(
    summary: any,
    title: string = 'Attendance Summary Report'
  ): string {
    return `
      <div class="report-section">
        <h2>${title}</h2>

        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-label">Total Records</span>
            <span class="stat-value">${summary.totalRecords || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Present</span>
            <span class="stat-value">${summary.byStatus?.present || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Late</span>
            <span class="stat-value">${summary.byStatus?.late || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Absent</span>
            <span class="stat-value">${summary.byStatus?.absent || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Avg Hours</span>
            <span class="stat-value">${summary.avgHours || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Overtime</span>
            <span class="stat-value">${summary.totalOvertime || 0}h</span>
          </div>
        </div>

        ${summary.presentRate !== undefined ? `
          <div class="rate-section">
            <h3>Rates</h3>
            <p>Presence Rate: <strong>${summary.presentRate || 0}%</strong></p>
            <p>Absence Rate: <strong>${summary.absentRate || 0}%</strong></p>
          </div>
        ` : ''}

        ${summary.records && summary.records.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Status</th>
                <th>Hours</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              ${summary.records.map((r: any) => `
                <tr>
                  <td>${r.employee || '-'}</td>
                  <td>${r.department || '-'}</td>
                  <td>${r.date}</td>
                  <td>${r.checkIn || '-'}</td>
                  <td>${r.checkOut || '-'}</td>
                  <td>${r.status}</td>
                  <td>${r.hours || 0}</td>
                  <td>${r.checkInLocation?.address || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
      <style>
        .report-section { page-break-inside: avoid; }
        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
        .stat-item { border: 1px solid #ddd; padding: 15px; text-align: center; }
        .stat-label { display: block; color: #666; font-size: 12px; }
        .stat-value { display: block; font-size: 24px; font-weight: bold; color: #4CAF50; }
        .rate-section { margin: 20px 0; padding: 15px; background: #f5f5f5; }
      </style>
    `;
  }

  // ========== PRIVATE HELPERS ==========

  private generateCSV(data: any[], keys: string[]): string {
    const header = keys.join(',');
    const rows = data.map(row =>
      keys.map(key => {
        const value = row[key];
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value || '').replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      }).join(',')
    );
    return [header, ...rows].join('\n');
  }

  private generateTSV(data: any[], keys: string[]): string {
    const header = keys.join('\t');
    const rows = data.map(row =>
      keys.map(key => row[key] || '').join('\t')
    );
    return [header, ...rows].join('\n');
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
