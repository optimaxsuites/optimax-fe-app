import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NextOfKin {
  id?: number;
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  relationship?: string;
  DOB?: string;
  emergencyContact?: boolean;
}

export interface Guarantor {
  id?: number;
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  relationship?: string;
  yearsKnown?: number;
}

@Component({
  selector: 'app-employee-relatives-widget',
  templateUrl: './employee-relatives-widget.component.html',
  styleUrls: ['./employee-relatives-widget.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class EmployeeRelativesWidgetComponent implements OnInit {
  @Input() nextOfKinList: NextOfKin[] = [];
  @Input() guarantorList: Guarantor[] = [];
  @Input() employeeName: string = 'Employee';

  selectedTab: 'nok' | 'guarantor' = 'nok';

  ngOnInit(): void {
    // Ensure we have arrays
    if (!this.nextOfKinList) this.nextOfKinList = [];
    if (!this.guarantorList) this.guarantorList = [];
  }

  selectTab(tab: 'nok' | 'guarantor'): void {
    this.selectedTab = tab;
  }

  getRelationshipBadgeClass(relationship: string | undefined): string {
    if (!relationship) return 'badge-neutral';
    const relationshipLower = relationship.toLowerCase();
    if (relationshipLower.includes('spouse')) return 'badge-primary';
    if (relationshipLower.includes('child')) return 'badge-success';
    if (relationshipLower.includes('parent')) return 'badge-info';
    if (relationshipLower.includes('sibling')) return 'badge-warning';
    return 'badge-neutral';
  }

  isEmergencyContact(contact: NextOfKin): boolean {
    return contact.emergencyContact === true;
  }
}
