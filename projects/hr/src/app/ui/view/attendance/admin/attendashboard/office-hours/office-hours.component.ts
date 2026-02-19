import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { OfficeHoursService } from '../../../../../service/attendance/office-hours.service';

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
      closingTime: [hours.closingTime]
    });
  }

  save() {
    this.officeHoursService.updateOfficeHours(this.form.value);
    this.editMode = false;
  }

  editMode = false;

resetDefault() {
  const defaultHours = { openingTime: '09:00', closingTime: '17:00' };
  this.form.setValue(defaultHours);
  this.officeHoursService.updateOfficeHours(defaultHours);
  this.editMode = false;
}


}
