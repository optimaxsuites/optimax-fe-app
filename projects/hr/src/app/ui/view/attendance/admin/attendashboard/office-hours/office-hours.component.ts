import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { OfficeHoursService } from '../../../../../service/attendance/office-hours.service';
import { AbstractControl, ValidationErrors } from '@angular/forms';

function officeHoursValidator(control: AbstractControl): ValidationErrors | null {

  const opening = control.get('openingTime')?.value;
  const grace = control.get('latenessGracePeriod')?.value;
  const absent = control.get('absentTime')?.value;
  const closing = control.get('closingTime')?.value;

  if (!opening || !grace || !absent || !closing) return null;

  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const openMin = toMinutes(opening);
  const graceMin = toMinutes(grace);
  const absentMin = toMinutes(absent);
  const closeMin = toMinutes(closing);

  if (!(openMin <= graceMin && graceMin <= absentMin && absentMin <= closeMin)) {
    return { invalidOfficeHours: true };
  }

  return null;
}

@Component({
  selector: 'app-office-hours',
  templateUrl: './office-hours.component.html',
  styleUrl: './office-hours.component.scss'
})
export class OfficeHoursComponent implements OnInit{
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private officeHoursService: OfficeHoursService
  ) {}

  ngOnInit() {
    const hours = this.officeHoursService.getOfficeHours();

    this.form = this.fb.group({
      openingTime: [hours.openingTime],
      closingTime: [hours.closingTime],
      absentTime: [hours.absentTime],
      latenessGracePeriod: [hours.latenessGracePeriod]
    },
    {validators: officeHoursValidator});
  }

  save() {
    if(this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.officeHoursService.updateOfficeHours(this.form.value);
    this.editMode = false;
  }

  editMode = false;

resetDefault() {
  const defaultHours = { openingTime: '09:00', closingTime: '17:00', absentTime: '10:00', latenessGracePeriod: '09:15' };
  this.form.setValue(defaultHours);
  this.officeHoursService.updateOfficeHours(defaultHours);
  this.editMode = false;
}


}
