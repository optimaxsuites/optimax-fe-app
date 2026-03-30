import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  HotelserviceService,
  MaintenainceRequest,
} from '../../hospitality/hotelservice.service';

export interface Todo {
  id?: number;
  title: string;
  description?: string;
  reason?: string; // Added reason field
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  category?: string;
  roomNumber?: number;
  roomId?: number;
}
export interface Guest {
  id?: string; // Optional property for guest ID
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  idNumber: string;
  gender: string;
}

export interface BookingDetails {
  checkinDate: Date;
  checkoutDate: Date;
  adults: number;
  children: number;
  specialRequests?: string;
  paymentMethod: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

export interface Room {
  id: number;
  number: number;
  type: string;
  status: string;
  floor?: number;
  guest?: Guest; // Optional property for guest
  rate: number;
  bookingDetails?: BookingDetails;
  beds?: number;
  maxOccupancy?: number;
  description?: string;
  amenities?: string[];
  currentKey?: RoomKey; // Optional property for current key
  maintenanceReason?: string;
  maintenanceTasks?: string[];
  maintenanceStartDate?: Date;
  maintenanceNotes?: string;
}

export interface Booking {
  guest: Guest;
  checkinDate: Date;
  checkoutDate: Date;
  adults: number;
  children: number;
  specialRequests: string;
  paymentMethod: string;
  depositAmount: number;
  roomIds: number[];
  roomTypes: string[];
  roomRates: number[];
  subtotal: number;
  taxes: number;
  total: number;
  balanceAmount: number;
  status?: string;
}

export interface RoomKey {
  id: string;
  roomNumber: number;
  roomId: number;
  isActive: boolean;
  assignedDate: Date;
  deactivationDate: Date;
  guestIdNumber: string;
  guestName?: string;
}

export interface KeyCardLog {
  id: string;
  roomNumber: number;
  roomId: number;
  keyCardId: string;
  guestIdNumber: string;
  accessType: 'GUEST' | 'MASTER' | 'STAFF';
  timestamp: Date;
  accessGranted: boolean;
}

@Component({
  selector: 'app-hotel-maintenancenote',
  templateUrl: './hotel-maintenancenote.component.html',
  styleUrls: ['./hotel-maintenancenote.component.scss'],
})
export class HotelMaintenancenoteComponent implements OnInit {
  @Input() room: Room | null = null;
  @Output() back = new EventEmitter<void>();
  @Output() maintenanceComplete = new EventEmitter<void>();
  @Input() maintenanceRequests: MaintenainceRequest[] = [];

  todos: Todo[] = [];
  filteredTodos: Todo[] = [];
  newTodoTitle: string = '';
  newTodoReason: string = ''; // Added for reason input
  newTodoPriority: 'low' | 'medium' | 'high' = 'medium';
  currentFilter: 'all' | 'active' | 'completed' = 'all';
  sortBy: 'priority' | 'name' | 'dueDate' = 'priority';
  completedCount: number = 0;
  completionPercentage: number = 0;
  allTasksCompleted: boolean = false;

  constructor(
    private messageService: MessageService,
    private hotelService: HotelserviceService
  ) {}

  ngOnInit() {
    this.fetchMaintenanceRequests();
    this.updateFilteredTodos();
    this.updateProgress();
  }

  fetchMaintenanceRequests() {
    if (this.room) {
      this.hotelService.getMaintenanceRequests().subscribe({
        next: (requests) => {
          this.todos = requests
            .filter((req) => req.room === this.room!.id && !req.completed)
            .map((req) => ({
              id: req.id,
              title: req.tasks,
              reason: req.reasons.join(', '),
              completed: req.completed,
              priority: req.priority.toLowerCase() as 'low' | 'medium' | 'high',
              dueDate: req.dueDate ? new Date(req.dueDate) : undefined,
              roomNumber: this.room?.number,
              roomId: this.room?.id,
            }));
          this.updateFilteredTodos();
          this.updateProgress();
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch maintenance requests',
          });
        },
      });
    }
  }

  addTodo() {
    if (this.newTodoTitle.trim() === '') return;
    if (!this.room) return;
    const newRequest: MaintenainceRequest = {
      id: 0,
      tasks: this.newTodoTitle.trim(),
      reasons: this.newTodoReason ? [this.newTodoReason.trim()] : [],
      startDate: new Date().toISOString(),
      notes: '',
      completed: false,
      priority:
        this.newTodoPriority.charAt(0).toUpperCase() +
        this.newTodoPriority.slice(1),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      completedAt: '',
      room: this.room.id,
    };
    this.hotelService.createMaintenanceRequest(newRequest).subscribe({
      next: (created) => {
        this.fetchMaintenanceRequests();
        this.newTodoTitle = '';
        this.newTodoReason = '';
        this.updateFilteredTodos();
        this.updateProgress();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to add maintenance task',
        });
      },
    });
  }

  toggleTodo(todo: Todo) {
    if (!this.room || !todo.id) return;
    const updatedRequest: MaintenainceRequest = {
      id: todo.id,
      tasks: todo.title,
      reasons: todo.reason ? [todo.reason] : [],
      startDate: todo.dueDate
        ? todo.dueDate.toISOString()
        : new Date().toISOString(),
      notes: '',
      completed: !todo.completed,
      priority: todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1),
      dueDate: todo.dueDate
        ? todo.dueDate.toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      completedAt: !todo.completed ? new Date().toISOString() : '',
      room: this.room.id,
    };
    this.hotelService
      .updateMaintenanceRequest(todo.id, updatedRequest)
      .subscribe({
        next: () => {
          this.fetchMaintenanceRequests();
          this.updateFilteredTodos();
          this.updateProgress();
          if (this.todos.every((t) => t.completed)) {
            this.maintenanceComplete.emit();
          }
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update maintenance task',
          });
        },
      });
  }

  updateRoomStatus() {
    if (this.room && this.todos.length > 0) {
      const allCompleted = this.todos.every((todo) => todo.completed);
      if (allCompleted) {
        this.allTasksCompleted = true;
      } else {
        this.allTasksCompleted = false;
      }
    }
  }

  completeMaintenance() {
    if (this.room && this.allTasksCompleted) {
      const storedRooms = localStorage.getItem('rooms');
      if (storedRooms) {
        const rooms: Room[] = JSON.parse(storedRooms);
        const roomIndex = rooms.findIndex((r) => r.id === this.room?.id);

        if (roomIndex !== -1) {
          rooms[roomIndex].status = 'available';
          // Clear maintenance information
          rooms[roomIndex].maintenanceReason = undefined;
          rooms[roomIndex].maintenanceTasks = undefined;

          localStorage.setItem('rooms', JSON.stringify(rooms));

          localStorage.removeItem(`maintenanceTodos_${this.room.id}`);

          this.maintenanceComplete.emit();
          this.back.emit();

          this.messageService.add({
            severity: 'success',
            summary: 'Maintenance Completed',
            detail: `Room ${this.room.number} is now available`,
          });
        }
      }
    }
  }

  deleteTodo(todo: Todo) {
    this.todos = this.todos.filter((t) => t.id !== todo.id);
    this.updateFilteredTodos();
    this.updateProgress();
    this.updateRoomStatus();
  }

  updateProgress() {
    this.completedCount = this.todos.filter((todo) => todo.completed).length;
    this.completionPercentage =
      this.todos.length > 0
        ? Math.round((this.completedCount / this.todos.length) * 100)
        : 0;
  }

  setFilter(filter: 'all' | 'active' | 'completed') {
    this.currentFilter = filter;
    this.updateFilteredTodos();
  }

  clearCompleted() {
    this.todos = this.todos.filter((todo) => !todo.completed);
    this.updateFilteredTodos();
    this.updateProgress();
  }

  sortTodos() {
    this.updateFilteredTodos();
  }

  updateFilteredTodos() {
    // Apply filter
    let filtered = [...this.todos];

    if (this.currentFilter === 'active') {
      filtered = filtered.filter((todo) => !todo.completed);
    } else if (this.currentFilter === 'completed') {
      filtered = filtered.filter((todo) => todo.completed);
    }

    // Apply sorting
    if (this.sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      filtered.sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      );
    } else if (this.sortBy === 'name') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (this.sortBy === 'dueDate') {
      filtered.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
    }

    this.filteredTodos = filtered;
  }

  private generateId(): number {
    const ids = this.todos.map((todo) => todo.id).filter((id): id is number => !!id);
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
  }

  closeModal() {
    this.back.emit();
  }
}
