import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { CrmApiService } from '../../service/crm-api.service';
import { Contact } from '../../domain/crm.model';

@Component({
  selector: 'app-crm-contact-form',
  templateUrl: './crm-contact-form.component.html',
})
export class CrmContactFormComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  isEdit: boolean;
  typeOptions = ['LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED'];
  sourceOptions = ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'COLD_CALL', 'EMAIL', 'EVENT', 'PARTNER', 'OTHER'];

  constructor(
    private fb: FormBuilder,
    private api: CrmApiService,
    private snack: MatSnackBar,
    public dialogRef: MatDialogRef<CrmContactFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Contact | null,
  ) {
    this.isEdit = !!data;
  }

  ngOnInit() {
    const d = this.data;
    this.form = this.fb.group({
      firstName:    [d?.firstName || '', []],
      lastName:     [d?.lastName  || '', []],
      email:        [d?.email     || ''],
      phone:        [d?.phone     || ''],
      whatsapp:     [d?.whatsapp  || ''],
      jobTitle:     [d?.jobTitle  || ''],
      companyName:  [d?.companyName || ''],
      contactType:  [d?.contactType || 'LEAD'],
      leadSource:   [d?.leadSource || ''],
      ownerName:    [d?.ownerName || ''],
      address:      [d?.address || ''],
      city:         [d?.city || ''],
      state:        [d?.state || ''],
      nin:          [d?.nin || ''],
      bvn:          [d?.bvn || ''],
      tin:          [d?.tin || ''],
      ward:         [d?.ward || ''],
      linkedinUrl:  [d?.linkedinUrl || ''],
      tags:         [d?.tags || ''],
      ndpaConsent:  [d?.ndpaConsent || false],
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const payload: Contact = this.form.value;
    const obs = this.isEdit
      ? this.api.updateContact(this.data!.id!, payload)
      : this.api.createContact(payload);

    obs.pipe(finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.snack.open(this.isEdit ? 'Contact updated' : 'Contact created', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }
}
