import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';
@Component({
  selector: 'app-cooperative-member-form',
  templateUrl: './cooperative-member-form.component.html',
  styleUrls: ['./cooperative-member-form.component.scss']
})
export class CooperativeMemberFormComponent implements OnInit {
  memberForm!: FormGroup;
  isEdit = false;
  memberId?: string;
  isLoading = false;
  nextGeneratedMemberId = 'COP-001';
  existingMemberCode = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadNextMemberId();
    this.checkEditMode();
  }

  loadNextMemberId(): void {
    this.cooperativeService.getMembers().subscribe(members => {
      const maxSequence = members.reduce((max, member) => {
        const match = member.memberId?.match(/COP-(\d+)/);
        const sequence = match ? parseInt(match[1], 10) : 0;
        return Math.max(max, sequence);
      }, 0);

      this.nextGeneratedMemberId = `COP-${String(maxSequence + 1).padStart(3, '0')}`;
    });
  }

  initForm(): void {
    this.memberForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: [''],
      shareCapital: [0, [Validators.required, Validators.min(0)]],
      status: ['ACTIVE', Validators.required],
      emergencyName: [''],
      emergencyPhone: [''],
      emergencyRelationship: ['']
    });
  }

  checkEditMode(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEdit = true;
        this.memberId = params['id'];
        this.loadMember();
      }
    });
  }

  loadMember(): void {
    this.isLoading = true;
    const member = this.cooperativeService.getMemberById(this.memberId!);
    
    if (member) {
      this.existingMemberCode = member.memberId;
      this.memberForm.patchValue({
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        address: member.address || '',
        shareCapital: member.shareCapital,
        status: member.status,
        emergencyName: member.emergencyContact?.name || '',
        emergencyPhone: member.emergencyContact?.phone || '',
        emergencyRelationship: member.emergencyContact?.relationship || ''
      });
    }
    
    this.isLoading = false;
  }

  onSubmit(): void {
    if (this.memberForm.valid) {
      const formValue = this.memberForm.value;
      
      const memberData: any = {
        fullName: formValue.fullName,
        email: formValue.email,
        phone: formValue.phone,
        address: formValue.address,
        shareCapital: Number(formValue.shareCapital) || 0,
        status: formValue.status
      };

      // Add emergency contact if provided
      if (formValue.emergencyName && formValue.emergencyPhone) {
        memberData.emergencyContact = {
          name: formValue.emergencyName,
          phone: formValue.emergencyPhone,
          relationship: formValue.emergencyRelationship || 'Other'
        };
      }

      if (this.isEdit && this.memberId) {
        // Update existing
        const existing = this.cooperativeService.getMemberById(this.memberId);
        if (existing) {
          const updated = { ...existing, ...memberData };
          this.cooperativeService.updateMember(updated);
        }
      } else {
        // Add new
        this.cooperativeService.addMember(memberData);
      }

      this.goBack();
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/cooperative/members', uuidV4()]);
  }

  cancel(): void {
    this.goBack();
  }

  get currentShareCapital(): number {
    return Number(this.memberForm?.get('shareCapital')?.value || 0);
  }

  get maxShareBackedEligibility(): number {
    return this.currentShareCapital;
  }

  get memberIdDisplay(): string {
    return this.isEdit ? (this.existingMemberCode || 'Auto-generated') : this.nextGeneratedMemberId;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }
}