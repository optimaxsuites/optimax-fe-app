// src/app/core/models/project.model.ts
export interface Project {
  id?: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  budget?: number;
  // projectLead: User;
  template: ProjectTemplate;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum ProjectTemplate {
  SCRUM = 'SCRUM',
  KANBAN = 'KANBAN',
  WATERFALL = 'WATERFALL',
  SIMPLE = 'SIMPLE',
  CUSTOM = 'CUSTOM'
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
}



// src/app/core/models/task.model.ts
export interface Task {
  id?: string;
  title: string;
  description?: string;
  // assignees: User[];
  dueDate: Date;
  // priority: Priority;
  labels: string[];
  // attachments: Attachment[];
  dependencies: Task[];
  status: TaskStatus;
  sprint?: Sprint;
  // createdBy: User;
  createdAt: Date;
  updatedAt: Date;
}
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  BLOCKED = 'BLOCKED',
  ON_HOLD = 'ON_HOLD',
  CANCELED = 'CANCELED',
  BACKLOG = 'BACKLOG'
}

// src/app/core/models/sprint.model.ts
export interface Sprint {
  id?: string;
  name: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  goal: string;
  tasks: Task[];
  status: SprintStatus;
  createdAt: Date;
  updatedAt: Date;
}
export enum SprintStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED'
}