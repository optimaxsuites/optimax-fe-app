import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';

export interface Todo {
  id: number;
  title: string;
  description?: string;
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

  todos: Todo[] = [];
  filteredTodos: Todo[] = [];
  newTodoTitle: string = '';
  newTodoPriority: 'low' | 'medium' | 'high' = 'medium';
  currentFilter: 'all' | 'active' | 'completed' = 'all';
  sortBy: 'priority' | 'name' | 'dueDate' = 'priority';
  completedCount: number = 0;
  completionPercentage: number = 0;
  allTasksCompleted: boolean = false;

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    this.loadTodos();
    this.updateFilteredTodos();
    this.updateProgress();
  }

  loadTodos() {
    if (this.room) {
      const savedTodos = localStorage.getItem(
        `maintenanceTodos_${this.room.id}`
      );
      this.todos = savedTodos ? JSON.parse(savedTodos) : [];

      // Initialize with room data if empty
      if (this.todos.length === 0 && this.room) {
        this.todos = this.todos.map((todo) => ({
          ...todo,
          roomNumber: this.room?.number,
          roomId: this.room?.id,
        }));
      }
    }
  }

  saveTodos() {
    if (this.room) {
      localStorage.setItem(
        `maintenanceTodos_${this.room.id}`,
        JSON.stringify(this.todos)
      );
    }
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
      // Update room status in localStorage
      const storedRooms = localStorage.getItem('rooms');
      if (storedRooms) {
        const rooms: Room[] = JSON.parse(storedRooms);
        const roomIndex = rooms.findIndex((r) => r.id === this.room?.id);

        if (roomIndex !== -1) {
          rooms[roomIndex].status = 'available';
          localStorage.setItem('rooms', JSON.stringify(rooms));

          // Clear maintenance todos
          localStorage.removeItem(`maintenanceTodos_${this.room.id}`);

          // Emit events
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

  addTodo() {
    if (this.newTodoTitle.trim() === '') return;

    const newTodo: Todo = {
      id: this.generateId(),
      title: this.newTodoTitle.trim(),
      completed: false,
      priority: this.newTodoPriority,
      roomNumber: this.room?.number,
      roomId: this.room?.id,
    };

    this.todos.unshift(newTodo);
    this.newTodoTitle = '';
    this.saveTodos();
    this.updateFilteredTodos();
    this.updateProgress();
  }

  toggleTodo(todo: Todo) {
    todo.completed = !todo.completed;
    this.saveTodos();
    this.updateFilteredTodos();
    this.updateProgress();
    this.updateRoomStatus();
  }

  deleteTodo(todo: Todo) {
    this.todos = this.todos.filter((t) => t.id !== todo.id);
    this.saveTodos();
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
    this.saveTodos();
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
    return this.todos.length > 0
      ? Math.max(...this.todos.map((todo) => todo.id)) + 1
      : 1;
  }

  closeModal() {
    this.back.emit();
  }
}
