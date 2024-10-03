import { Component, EventEmitter, Input, Output } from '@angular/core';
import { JobDTO } from '../../../domain/job.dto';

@Component({
  selector: 'app-recuitment-form',
  templateUrl: './recuitment-form.component.html',
  styleUrl: './recuitment-form.component.scss'
})
export class RecuitmentFormComponent {
  @Output() back = new EventEmitter<void>();
  @Output() submitFrom = new EventEmitter<any>();
  jobData: JobDTO = {};




  goBack() {
    this.back.emit();
  }

  submitForm() {

    localStorage.setItem('jobData', JSON.stringify(this.jobData));
    
    console.log(this.jobData);

    this.submitFrom.emit();
  }

}
