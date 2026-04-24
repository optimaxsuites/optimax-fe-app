import { Component, OnInit } from '@angular/core';
import { ProductivityLiveDataService } from '../../productivity-live-data.service';
import { ProductivityTask } from '../../productivity.models';

@Component({
  selector: 'app-productivity-tasks-page',
  templateUrl: './productivity-tasks-page.component.html',
  styleUrls: ['./productivity-tasks-page.component.scss'],
})
export class ProductivityTasksPageComponent implements OnInit {
  tasks: ProductivityTask[] = [];
  selectedFilter = 'All statuses';

  constructor(private readonly productivityLiveDataService: ProductivityLiveDataService) {}

  ngOnInit(): void {
    this.productivityLiveDataService.vm$.subscribe((vm) => {
      this.tasks = vm.tasks;
    });
  }

  groupedTasks(): { label: string; items: ProductivityTask[] }[] {
    return [
      { label: 'Needs attention', items: this.tasks.filter((task) => ['Overdue', 'Blocked'].includes(task.status)) },
      { label: 'In execution', items: this.tasks.filter((task) => task.status === 'In Progress') },
      { label: 'Ready or completed', items: this.tasks.filter((task) => ['Not Started', 'Completed'].includes(task.status)) },
    ];
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
  }
}
