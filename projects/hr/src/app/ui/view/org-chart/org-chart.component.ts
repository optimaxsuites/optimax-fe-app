import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface OrgEmployee {
  id: number;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  department?: { id: number; name: string };
  level?: { id: number; name: string };
  supervisor?: string;
  profilePhotoUrl?: string;
  employeeStatus?: string;
}

export interface OrgDept {
  id: number;
  name: string;
}

interface OrgNode {
  employee: OrgEmployee;
  reports: OrgNode[];
}

@Component({
  selector: 'app-org-chart',
  templateUrl: './org-chart.component.html',
  styleUrl: './org-chart.component.scss',
})
export class OrgChartComponent implements OnInit {
  readonly BASE = 'https://be.optimaxsuites.com/x/api/v2/hr';
  readonly AVATAR = 'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=100';

  loading = true;
  error = false;

  employees: OrgEmployee[] = [];
  departments: OrgDept[] = [];

  viewMode: 'department' | 'hierarchy' = 'department';
  searchTerm = '';
  selectedDept: number | null = null;

  // department view
  deptGroups: { dept: string; employees: OrgEmployee[] }[] = [];

  // hierarchy view
  rootNodes: OrgNode[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    forkJoin({
      employees: this.http.get<any>(`${this.BASE}/employees?size=300`),
      departments: this.http.get<any>(`${this.BASE}/departments?size=100`).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ employees, departments }) => {
        const rawEmployees: OrgEmployee[] = Array.isArray(employees) ? employees : (employees as any)?.content ?? [];
        this.employees = [...new Map(rawEmployees.map(e => [e.id, e])).values()];
        const rawDepts: OrgDept[] = Array.isArray(departments) ? departments : (departments as any)?.content ?? [];
        this.departments = [...new Map(rawDepts.map(d => [d.id, d])).values()];
        if (this.employees.length === 0) {
          this.error = true;
        } else {
          this.buildViews();
        }
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  private buildViews(): void {
    this.buildDeptView();
    this.buildHierarchyView();
  }

  private buildDeptView(): void {
    const map = new Map<string, OrgEmployee[]>();
    for (const emp of this.employees) {
      const deptName = emp.department?.name ?? 'Unassigned';
      if (!map.has(deptName)) map.set(deptName, []);
      map.get(deptName)!.push(emp);
    }
    this.deptGroups = [...map.entries()].map(([dept, employees]) => ({ dept, employees }))
      .sort((a, b) => a.dept.localeCompare(b.dept));
  }

  private buildHierarchyView(): void {
    // supervisor is a string name, so build a name→node map for matching
    const byName = new Map<string, OrgNode[]>();
    const allNodes: OrgNode[] = [];
    for (const emp of this.employees) {
      const node: OrgNode = { employee: emp, reports: [] };
      allNodes.push(node);
      const fullN = this.fullName(emp).toLowerCase();
      if (!byName.has(fullN)) byName.set(fullN, []);
      byName.get(fullN)!.push(node);
    }

    const roots: OrgNode[] = [];
    for (const node of allNodes) {
      const supName = (node.employee.supervisor ?? '').trim().toLowerCase();
      if (supName) {
        const supNodes = byName.get(supName);
        if (supNodes?.length) {
          supNodes[0].reports.push(node);
          continue;
        }
      }
      roots.push(node);
    }
    this.rootNodes = roots;
  }

  get filteredDeptGroups(): { dept: string; employees: OrgEmployee[] }[] {
    const term = this.searchTerm.toLowerCase();
    return this.deptGroups
      .filter(g => this.selectedDept === null || g.dept === this.departments.find(d => d.id === this.selectedDept)?.name)
      .map(g => ({
        dept: g.dept,
        employees: term
          ? g.employees.filter(e =>
              `${e.firstName} ${e.lastName}`.toLowerCase().includes(term) ||
              (e.jobTitle ?? '').toLowerCase().includes(term))
          : g.employees,
      }))
      .filter(g => g.employees.length > 0);
  }

  get filteredRoots(): OrgNode[] {
    const term = this.searchTerm.toLowerCase();
    if (!term) return this.rootNodes;
    return this.rootNodes.filter(n => this.nodeMatchesTerm(n, term));
  }

  private nodeMatchesTerm(node: OrgNode, term: string): boolean {
    const name = `${node.employee.firstName} ${node.employee.lastName}`.toLowerCase();
    if (name.includes(term) || (node.employee.jobTitle ?? '').toLowerCase().includes(term)) return true;
    return node.reports.some(r => this.nodeMatchesTerm(r, term));
  }

  fullName(emp: OrgEmployee): string {
    return `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
  }

  initials(emp: OrgEmployee): string {
    return `${(emp.firstName ?? '')[0] ?? ''}${(emp.lastName ?? '')[0] ?? ''}`.toUpperCase();
  }

  deptColor(dept: string): string {
    const colors = ['#2E6276', '#2EB270', '#f59e0b', '#8b5cf6', '#ef4444', '#0891b2', '#10b981', '#f97316'];
    let hash = 0;
    for (const c of dept) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
    return colors[Math.abs(hash) % colors.length];
  }

  totalCount(): number {
    return this.employees.length;
  }

  deptCount(): number {
    return this.deptGroups.length;
  }
}
