import { Component } from '@angular/core';

@Component({
  selector: 'app-vacancy-form',
  templateUrl: './vacancy-form.component.html',
  styleUrl: './vacancy-form.component.scss'
})
export class VacancyFormComponent {
  vacancyTypes = ['Full Time', 'Part Time', 'Contract'];
  jobCategories = ['IT', 'HR', 'Marketing', 'Sales', 'Finance', 'Operations', 'Customer Service'];
  vacancyStatuses = ['Open', 'Closed', 'On Hold'];

  constructor() {
  }

  ngOnInit() {

  }

  onSubmit() {

  }
}
