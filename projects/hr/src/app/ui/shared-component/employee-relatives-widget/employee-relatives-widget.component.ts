import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
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

export interface NokEventPayload {
  type: 'add' | 'edit' | 'delete';
  contact: NextOfKin;
}

export interface GuarantorEventPayload {
  type: 'add' | 'edit' | 'delete';
  contact: Guarantor;
}
@Component({
  selector: 'app-employee-relatives-widget',
  templateUrl: './employee-relatives-widget.component.html',
  styleUrls: ['./employee-relatives-widget.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class EmployeeRelativesWidgetComponent implements OnInit {
// editNextOfKin(_t20: NextOfKin,_t21: number) {
// throw new Error('Method not implemented.');
// }
// deleteNextOfKin(_t20: NextOfKin,_t21: number) {
// throw new Error('Method not implemented.');
// }
// editGuarantor(_t71: Guarantor,_t72: number) {
// throw new Error('Method not implemented.');
// }
// deleteGuarantor(_t71: Guarantor,_t72: number) {
// throw new Error('Method not implemented.');
// }
  @Input() nextOfKinList: NextOfKin[] = [];
  @Input() guarantorList: Guarantor[] = [];
  @Input() employeeName: string = 'Employee';
  @Output() openNokChangeRequest = new EventEmitter<NokEventPayload>();
  @Output() openGuarantorChangeRequest = new EventEmitter<GuarantorEventPayload>();

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

  editNextOfKin(contact: NextOfKin, index: number): void {
    this.openNokChangeRequest.emit({ type: 'edit', contact });
  }

  deleteNextOfKin(contact: NextOfKin, index: number): void {
    this.openNokChangeRequest.emit({ type: 'delete', contact });
  }

  editGuarantor(guarantor: Guarantor, index: number): void {
    this.openGuarantorChangeRequest.emit({ type: 'edit', contact: guarantor });
  }

  deleteGuarantor(guarantor: Guarantor, index: number): void {
    this.openGuarantorChangeRequest.emit({ type: 'delete', contact: guarantor });
  }
}
