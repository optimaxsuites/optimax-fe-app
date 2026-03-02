import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeStats, CooperativeLoan, CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-dashboard',
  templateUrl: './cooperative-dashboard.component.html',
  styleUrls: ['./cooperative-dashboard.component.scss']
})
export class CooperativeDashboardComponent implements OnInit {
  stats!: CooperativeStats;
  recentLoans: CooperativeLoan[] = [];
  recentMembers: CooperativeMember[] = [];
  isLoading = true;

  constructor(
    private cooperativeService: CooperativeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;
    
    // Get stats
    this.stats = this.cooperativeService.getStats();
    
    // Get recent loans
    this.cooperativeService.getLoans().subscribe(loans => {
      this.recentLoans = loans
        .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime())
        .slice(0, 5);
    });
    
    // Get recent members
    this.cooperativeService.getMembers().subscribe(members => {
      this.recentMembers = members
        .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime())
        .slice(0, 5);
      this.isLoading = false;
    });
  }

  navigateTo(path: string): void {
    this.router.navigate([`/admin/hr/cooperative/${path}`]);
  }

  viewMember(id: string): void {
    this.router.navigate([`/admin/hr/cooperative/members/${id}`]);
  }

  viewLoan(id: string): void {
    this.router.navigate([`/admin/hr/cooperative/loans/${id}`]);
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }
}