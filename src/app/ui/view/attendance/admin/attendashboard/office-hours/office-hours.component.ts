import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { OfficeHoursService, ScheduleMode } from '../../../../../service/attendance/office-hours.service';
import { AbstractControl, ValidationErrors } from '@angular/forms';

function officeHoursValidator(control: AbstractControl): ValidationErrors | null {

  const opening = control.get('openingTime')?.value;
  const grace = control.get('latenessGracePeriod')?.value;
  const absent = control.get('absentTime')?.value;
  const closing = control.get('closingTime')?.value;

  if (!opening || !grace || !absent || !closing) return null;

  /*const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };*/

  const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const [openMin, graceMin, absentMin, closeMin] = [opening, grace, absent, closing].map(toMinutes);
  return (openMin <= graceMin && graceMin <= absentMin && absentMin <= closeMin) ? null : { invalidOfficeHours: true };

  /*const openMin = toMinutes(opening);
  const graceMin = toMinutes(grace);
  const absentMin = toMinutes(absent);
  const closeMin = toMinutes(closing);

  if (!(openMin <= graceMin && graceMin <= absentMin && absentMin <= closeMin)) {
    return { invalidOfficeHours: true };
  }

  return null;*/
}

@Component({
  selector: 'app-office-hours',
  templateUrl: './office-hours.component.html',
  styleUrl: './office-hours.component.scss'
})
export class OfficeHoursComponent implements OnInit{
  form!: FormGroup;
  editMode = false;

  // The three modes the admin can choose from
  readonly scheduleModes: { value: ScheduleMode; label: string; description: string }[] = [
    {
      value: 'office-hours',
      label: 'Fixed Office Hours',
      description: 'All employees follow the same global schedule.'
    },
    {
      value: 'shift',
      label: 'Shift-Based',
      description: 'Employees follow their assigned shift from Work Schedules.'
    },
    {
      value: 'mixed',
      label: 'Mixed',
      description: 'Shift-assigned employees use their shift; all others use office hours.'
    }
  ];

  selectedMode!: ScheduleMode;


  constructor(
    private fb: FormBuilder,
    private officeHoursService: OfficeHoursService
  ) {}

  ngOnInit() {
    const hours = this.officeHoursService.getOfficeHours();
    this.selectedMode = this.officeHoursService.getScheduleMode();

    this.form = this.fb.group({
      openingTime: [hours.openingTime],
      closingTime: [hours.closingTime],
      absentTime: [hours.absentTime],
      latenessGracePeriod: [hours.latenessGracePeriod]
    },
    {validators: officeHoursValidator});
  }

    setMode(mode: ScheduleMode) {
    this.selectedMode = mode;
  }
//getter to replace modeLabel pipe
getModeLabel(modeValue: ScheduleMode): string {
  return this.scheduleModes.find(m => m.value === modeValue)?.label ?? modeValue;
}

  // Whether the office hours form is relevant given the selected mode
  get officeHoursRelevant(): boolean {
    return this.selectedMode === 'office-hours' || this.selectedMode === 'mixed';
  }

    save() {
    if (this.officeHoursRelevant && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.officeHoursService.setScheduleMode(this.selectedMode);
    if (this.officeHoursRelevant) {
      this.officeHoursService.updateOfficeHours(this.form.value);
    }
    this.editMode = false;
  }

 /* save() {
    if(this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.officeHoursService.updateOfficeHours(this.form.value);
    this.editMode = false;
  }

  editMode = false;*/

resetDefault() {
  const defaultHours = { openingTime: '09:00', closingTime: '17:00', absentTime: '10:00', latenessGracePeriod: '09:15' };
  this.form.setValue(defaultHours);
  this.officeHoursService.updateOfficeHours(defaultHours);
  this.editMode = false;
}


}
