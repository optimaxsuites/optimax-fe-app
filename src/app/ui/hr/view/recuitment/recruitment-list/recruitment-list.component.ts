import { Component } from '@angular/core';
import { JobDTO } from '../../../domain/job.dto';

@Component({
  selector: 'app-recruitment-list',
  templateUrl: './recruitment-list.component.html',
  styleUrl: './recruitment-list.component.scss'
})
export class RecruitmentListComponent {
  showRecruitmentList: boolean = true;
  showRecruitmentForm: boolean = false;
  activeItem: any = {};
  jobpostings: JobDTO[] = [];


  ngOnInit() {
    this.getJobPostings();
  }

  getJobPostings() {
    // Retrieve job data from localStorage
    const storedJobData = localStorage.getItem('jobData');
    if (storedJobData) {
      // Parse and assign the job data to jobpostings array
      this.jobpostings = [JSON.parse(storedJobData)];
    }
  }

  openForm(){
    this.showRecruitmentForm = true;
    this.showRecruitmentList = false;
  }

  editjob(job: any){
    this.activeItem = job;
  }

  createJob(){
    this.close();
  }

  close(){
    this.showRecruitmentForm = false;
    this.showRecruitmentList = true;
  }
}
