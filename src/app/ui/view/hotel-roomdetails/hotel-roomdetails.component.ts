import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';
import {
  HotelserviceService,
  Room,
  Guest,
  Booking,
  RoomStatus,
  MaintenainceRequest,
} from '../../hospitality/hotelservice.service';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-hotel-roomdetails',
  templateUrl: './hotel-roomdetails.component.html',
  styleUrls: ['./hotel-roomdetails.component.scss'],
  providers: [MessageService],
})
export class HotelRoomdetailsComponent implements OnInit, OnDestroy {
  @Input() room: Room | null = null;
  @Output() back = new EventEmitter<void>();
  @Output() statusChanged = new EventEmitter<Room>();
  @Input() selectedRoom: Room | null = null;
  @Input() showDetails: boolean = false;

  detailedRoom: Room | null = null;
  currentGuest: Guest | null = null;
  currentBooking: Booking | null = null;
  isLoading = false;

  private subscriptions = new Subscription();
  previousRoom: Room | null = null;
  openForm: boolean = false;
  openMessage: boolean = false;
  openBills: boolean = false;
  openRoom: boolean = false;
  openCheckinForm: boolean = false;
  openNote: boolean = false;
  openExtendStay: boolean = false;

  statusColors: any = {
    AVAILABLE: 'bg-emerald-500',
    BOOKED: 'bg-amber-500',
    OCCUPIED: 'bg-blue-500',
    UNDER_MAINTENANCE: 'bg-gray-500',
    CLEANING: 'bg-red-500',
  };

  selectedRooms: Room[] = [];
  formType: string | undefined;
  defaultCheckinDate: Date = new Date();
  defaultCheckoutDate: Date = new Date();

  openMaintenanceForm: boolean = false;
  maintenanceRequests: MaintenainceRequest[] = [];
  newMaintenanceRequest: MaintenainceRequest = {
    id: 0,
    tasks: '',
    reasons: [],
    startDate: new Date().toISOString(),
    notes: '',
    completed: false,
    priority: 'Medium',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    completedAt: '',
    room: 0,
  };
  maintenancePriorities: string[] = ['Low', 'Medium', 'High', 'Critical'];
  maintenanceReasons: string[] = [
    'Plumbing',
    'Electrical',
    'HVAC',
    'Furniture',
    'Appliance',
    'Structural',
    'Cleaning',
    'Other',
  ];

  constructor(
    private messageService: MessageService,
    private cdRef: ChangeDetectorRef,
    private hotelService: HotelserviceService
  ) {}

  ngOnInit(): void {
    if (this.room && this.room.id) {
      this.loadRoomDetails(this.room.id);
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  get isAvailable(): boolean {
    return this.detailedRoom?.roomStatus === 'AVAILABLE';
  }

  get isBooked(): boolean {
    return this.detailedRoom?.roomStatus === 'BOOKED';
  }

  get isOccupied(): boolean {
    return this.detailedRoom?.roomStatus === 'OCCUPIED';
  }

  get isMaintenance(): boolean {
    return this.detailedRoom?.roomStatus === 'UNDER_MAINTENANCE';
  }

  get isDirty(): boolean {
    return this.detailedRoom?.roomStatus === 'CLEANING';
  }

  getStatusSeverity(status: RoomStatus | undefined): string {
    switch (status) {
      case 'AVAILABLE':
        return 'success';
      case 'BOOKED':
        return 'warning';
      case 'OCCUPIED':
        return 'info';
      case 'UNDER_MAINTENANCE':
        return 'danger';
      case 'CLEANING':
        return 'help';
      default:
        return '';
    }
  }

  getPrioritySeverity(priority: string): string {
    switch (priority) {
      case 'Low':
        return 'info';
      case 'Medium':
        return 'warning';
      case 'High':
        return 'danger';
      case 'Critical':
        return 'danger';
      default:
        return '';
    }
  }

  private loadCompleteRoomDetails(roomId: number): void {
    this.subscriptions.add(
      forkJoin({
        room: this.hotelService.getRoom(roomId),
        bookings: this.hotelService.getBookings(),
        guests: this.hotelService.getGuests(),
        maintenance: this.hotelService.getMaintenanceRequests(),
      }).subscribe({
        next: (result) => {
          const room = result.room;
          const allBookings = result.bookings;
          const allGuests = result.guests;
          const allMaintenance = result.maintenance;

          // Find active booking for this room
          const activeBooking = allBookings.find(
            (booking) =>
              booking.rooms.includes(roomId) &&
              (booking.status === 'CONFIRMED' ||
                booking.status === 'CHECKED_IN')
          );

          // Find maintenance requests for this room
          this.maintenanceRequests = allMaintenance.filter(
            (req) => req.room === roomId && !req.completed
          );

          if (activeBooking) {
            const guest = this.findGuestForBooking(activeBooking, allGuests);
            this.assembleCompleteRoomData(room, activeBooking, guest);
          } else {
            this.showBasicRoomDetails(room);
          }
        },
        error: (err) => {
          console.error('Error loading room details:', err);
          this.handleLoadingError('Failed to load room details');
        },
      })
    );
  }

  private findGuestForBooking(
    booking: Booking,
    allGuests: Guest[]
  ): Guest | null {
    if (typeof booking.guest === 'number') {
      return allGuests.find((guest) => guest.id === booking.guest) || null;
    } else if (typeof booking.guest === 'object' && booking.guest !== null) {
      return booking.guest as Guest;
    }
    return null;
  }

  private assembleCompleteRoomData(
    room: Room,
    booking: Booking,
    guest: Guest | null
  ): void {
    this.detailedRoom = {
      ...room,
      roomType: this.getRoomTypeForRoom(room),
    };
    this.currentGuest = guest;
    this.currentBooking = booking;
    this.isLoading = false;
    this.cdRef.detectChanges();
  }

  private showBasicRoomDetails(room: Room): void {
    this.detailedRoom = {
      ...room,
      roomType: this.getRoomTypeForRoom(room),
    };
    this.currentGuest = null;
    this.currentBooking = null;
    this.isLoading = false;
    this.cdRef.detectChanges();
  }

  private getRoomTypeForRoom(room: Room): any {
    if (typeof room.roomType === 'object' && room.roomType !== null) {
      return room.roomType;
    }
    return {
      id: room.roomType,
      name: `Room Type ${room.roomType}`,
      description: '',
    };
  }

  calculateNights(checkinDate: string, checkoutDate: string): number {
    return this.hotelService.calculateNights(checkinDate, checkoutDate);
  }

  // Maintenance methods
  showMaintenanceForm(): void {
    if (!this.detailedRoom) return;

    this.newMaintenanceRequest = {
      id: 0,
      tasks: '',
      reasons: [],
      startDate: new Date().toISOString(),
      notes: '',
      completed: false,
      priority: 'Medium',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      completedAt: '',
      room: this.detailedRoom.id,
    };

    this.openMaintenanceForm = true;
  }

  createMaintenanceRequest(): void {
    if (!this.detailedRoom) return;

    if (!this.newMaintenanceRequest.tasks) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Tasks field is required',
      });
      return;
    }

    this.isLoading = true;
    const request: MaintenainceRequest = {
      ...this.newMaintenanceRequest,
      room: this.detailedRoom.id,
    };

    this.subscriptions.add(
      this.hotelService.createMaintenanceRequest(request).subscribe({
        next: (createdRequest) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Maintenance request created',
          });
          this.maintenanceRequests.push(createdRequest);
          this.openMaintenanceForm = false;
          this.isLoading = false;

          // Put room under maintenance if not already
          if (this.detailedRoom?.roomStatus !== 'UNDER_MAINTENANCE') {
            this.onStartMaintenance();
          }
        },
        error: (err) => {
          console.error('Error creating maintenance request:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create maintenance request',
          });
          this.isLoading = false;
        },
      })
    );
  }

  completeMaintenanceRequest(request: MaintenainceRequest): void {
    this.isLoading = true;
    const updatedRequest: MaintenainceRequest = {
      ...request,
      completed: true,
      completedAt: new Date().toISOString(),
    };

    this.subscriptions.add(
      this.hotelService
        .updateMaintenanceRequest(request.id, updatedRequest)
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Maintenance request completed',
            });
            request.completed = true;
            this.maintenanceRequests = this.maintenanceRequests.filter(
              (req) => !req.completed
            );
            this.isLoading = false;

            // If all maintenance completed, mark room as available
            if (this.maintenanceRequests.length === 0) {
              this.onCompleteMaintenance();
            }
          },
          error: (err) => {
            console.error('Error completing maintenance request:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to complete maintenance request',
            });
            this.isLoading = false;
          },
        })
    );
  }

  toggleReasonSelection(reason: string): void {
    const index = this.newMaintenanceRequest.reasons.indexOf(reason);
    if (index === -1) {
      this.newMaintenanceRequest.reasons.push(reason);
    } else {
      this.newMaintenanceRequest.reasons.splice(index, 1);
    }
  }

  isReasonSelected(reason: string): boolean {
    return this.newMaintenanceRequest.reasons.includes(reason);
  }

  // Room status methods
  onStartMaintenance(): void {
    if (!this.detailedRoom) return;
    this.openNote = true;
  }

  onCompleteMaintenance(): void {
    this.openNote = false;
    this.loadRoomDetails(this.detailedRoom!.id);
  }

  onCompleteCleaning(): void {
    if (!this.detailedRoom) return;

    const updatedRoom: Room = {
      ...this.detailedRoom,
      roomStatus: 'AVAILABLE',
    };

    this.updateRoomStatus(
      updatedRoom,
      'Cleaning Complete',
      'Room is now available'
    );
  }

  private updateRoomStatus(
    updatedRoom: Room,
    summary: string,
    detail: string
  ): void {
    this.isLoading = true;
    this.subscriptions.add(
      this.hotelService.updateRoom(updatedRoom.id!, updatedRoom).subscribe({
        next: () => {
          this.detailedRoom = updatedRoom;
          this.statusChanged.emit(updatedRoom);
          this.messageService.add({
            severity: 'success',
            summary: summary,
            detail: detail,
          });
          this.isLoading = false;
          this.cdRef.detectChanges();
        },
        error: (err) => {
          console.error(`Error updating room status:`, err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to update room status`,
          });
          this.isLoading = false;
          this.cdRef.detectChanges();
        },
      })
    );
  }

  // Booking methods
  onCancelBooking(): void {
    if (!this.currentBooking?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Booking Found',
        detail: 'No active booking found for this room',
      });
      return;
    }

    this.isLoading = true;
    const updatedBooking: Booking = {
      ...this.currentBooking,
      status: 'CANCELLED',
    };

    this.subscriptions.add(
      this.hotelService
        .updateBooking(this.currentBooking.id!, updatedBooking)
        .subscribe({
          next: () => {
            const updatedRoom: Room = {
              ...this.detailedRoom!,
              roomStatus: 'AVAILABLE',
            };

            this.subscriptions.add(
              this.hotelService
                .updateRoom(updatedRoom.id!, updatedRoom)
                .subscribe({
                  next: () => {
                    this.detailedRoom = updatedRoom;
                    this.currentGuest = null;
                    this.currentBooking = null;
                    this.statusChanged.emit(updatedRoom);
                    this.messageService.add({
                      severity: 'success',
                      summary: 'Booking Cancelled',
                      detail:
                        'Booking has been cancelled and room is now available',
                    });
                    this.isLoading = false;
                    this.cdRef.detectChanges();
                  },
                  error: (err) => {
                    console.error('Error updating room status:', err);
                    this.handleLoadingError(
                      'Booking cancelled but failed to update room status'
                    );
                  },
                })
            );
          },
          error: (err) => {
            console.error('Error cancelling booking:', err);
            this.handleLoadingError('Failed to cancel booking');
          },
        })
    );

    this.isLoading = true;
    this.cancelBookingAndUpdateRoom(this.currentBooking);
  }

  /**
   * Get booking details for display
   */
  getBookingDetails(): any {
    if (!this.currentBooking) return null;

    const checkinDate = new Date(this.currentBooking.checkinDate);
    const checkoutDate = new Date(this.currentBooking.checkoutDate);
    const nights = this.hotelService.calculateNights(
      this.currentBooking.checkinDate,
      this.currentBooking.checkoutDate
    );

    return {
      id: this.currentBooking.id,
      checkinDate: checkinDate,
      checkoutDate: checkoutDate,
      nights: nights,
      adults: this.currentBooking.adults,
      children: this.currentBooking.children,
      specialRequests: this.currentBooking.specialRequests,
      totalAmount: this.currentBooking.total,
      subTotal: this.currentBooking.subTotal,
      taxes: this.currentBooking.taxes || 0,
      paidAmount: this.currentBooking.depositAmount || 0,
      balanceAmount:
        this.currentBooking.balanceAmount ||
        this.currentBooking.total - (this.currentBooking.depositAmount || 0),
      status: this.currentBooking.status,
    };
  }

  /**
   * Handle loading errors consistently
   */
  private handleLoadingError(message: string): void {
    this.isLoading = false;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
    });
    this.cdRef.detectChanges();
  }

  closeModal(): void {
    this.showDetails = false;
    this.back.emit();
    this.detailedRoom = null;
    this.currentGuest = null;
    this.currentBooking = null;
    this.openForm = false;
    this.openMessage = false;
    this.openBills = false;
    this.openRoom = false;
    this.openCheckinForm = false;
    this.openNote = false;
    this.openExtendStay = false;
    this.cdRef.detectChanges();
  }

  navigateToMessage(): void {
    this.openMessage = !this.openMessage;
  }

  navigateToBills(): void {
    this.openBills = !this.openBills;
  }

  navigateToNote(): void {
    this.openNote = !this.openNote;
  }

  navigateToChangeRoom(): void {
    this.openRoom = !this.openRoom;
    this.openForm = false;
    this.openCheckinForm = false;
  }

  navigateTocheck(): void {
    this.openCheckinForm = !this.openCheckinForm;
  }

  navigateToExtend(): void {
    if (!this.detailedRoom && !this.selectedRoom) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No room selected',
      });
      return;
    }
    this.openExtendStay = !this.openExtendStay;
  }

  navigateToForm(): void {
    if (this.detailedRoom) {
      this.selectedRooms = [this.detailedRoom];
      this.formType =
        this.detailedRoom.roomStatus === 'BOOKED' ? 'checkin' : 'booking';
      this.openForm = true;
    }
  }

  private cancelBookingAndUpdateRoom(booking: Booking): void {
    const updatedBooking: Booking = {
      ...booking,
      status: 'CANCELLED',
    };

    this.subscriptions.add(
      this.hotelService.updateBooking(booking.id!, updatedBooking).subscribe({
        next: () => {
          const updatedRoom: Room = {
            ...this.detailedRoom!,
            roomStatus: 'AVAILABLE',
          };

          this.updateRoomAfterBookingCancel(updatedRoom);
        },
        error: (err) => {
          console.error('Error cancelling booking:', err);
          this.handleLoadingError('Failed to cancel booking');
        },
      })
    );
  }

  private updateRoomAfterBookingCancel(updatedRoom: Room): void {
    this.subscriptions.add(
      this.hotelService.updateRoom(updatedRoom.id!, updatedRoom).subscribe({
        next: () => {
          this.detailedRoom = updatedRoom;
          this.currentGuest = null;
          this.currentBooking = null;
          this.statusChanged.emit(updatedRoom);
          this.messageService.add({
            severity: 'success',
            summary: 'Booking Cancelled',
            detail: 'Booking has been cancelled and room is now available',
          });
          this.isLoading = false;
          this.cdRef.detectChanges();
        },
        error: (err) => {
          console.error('Error updating room status:', err);
          this.handleLoadingError(
            'Booking cancelled but failed to update room status'
          );
        },
      })
    );
  }

  getGuestFullName(): string {
    if (!this.currentGuest) return 'No Guest';

    return `${this.currentGuest.title || ''} ${
      this.currentGuest.firstName || ''
    } ${this.currentGuest.lastName || ''}`.trim();
  }

  /**
   * Load available rooms for room change functionality
   */
  loadAvailableRooms(): void {
    this.subscriptions.add(
      this.hotelService.getAvailableRooms().subscribe({
        next: (rooms) => {
          // Filter out the current room
          const availableRooms = rooms.filter(
            (room) => room.id !== this.detailedRoom?.id
          );
          // You can use this data for room change operations
        },
        error: (err) => {
          console.error('Error loading available rooms:', err);
        },
      })
    );
  }

  handleRoomChange(event: {
    newRoom: Room;
    note: string;
    maintenanceNote: string;
    oldRoomStatus: Room;
  }): void {
    if (!this.detailedRoom || !this.currentBooking) return;

    this.isLoading = true;
    const maintenanceTasks =
      event.maintenanceNote
        .match(/Tasks: (.*)/)?.[1]
        .split(', ')
        .filter(Boolean) || [];

    // Update old room (set to maintenance)
    const updatedOldRoom: Room = {
      ...this.detailedRoom,
      roomStatus: 'UNDER_MAINTENANCE',
    };

    // Update new room
    const updatedNewRoom: Room = {
      ...event.newRoom,
      roomStatus: this.detailedRoom.roomStatus,
    };

    // Update booking to reference new room
    const updatedBooking: Booking = {
      ...this.currentBooking,
      rooms: this.currentBooking.rooms.map((roomId) =>
        roomId === this.detailedRoom!.id ? updatedNewRoom.id! : roomId
      ),
    };

    this.subscriptions.add(
      forkJoin([
        this.hotelService.updateRoom(updatedOldRoom.id!, updatedOldRoom),
        this.hotelService.updateRoom(updatedNewRoom.id!, updatedNewRoom),
        this.hotelService.updateBooking(updatedBooking.id!, updatedBooking),
      ]).subscribe({
        next: () => {
          this.detailedRoom = updatedNewRoom;
          this.currentBooking = updatedBooking;
          this.statusChanged.emit(updatedNewRoom);
          this.statusChanged.emit(updatedOldRoom);
          this.messageService.add({
            severity: 'success',
            summary: 'Room Changed',
            detail: `Guest moved from Room ${updatedOldRoom.roomNumber} to Room ${updatedNewRoom.roomNumber}`,
          });
          this.isLoading = false;
          this.openRoom = false;
          this.cdRef.detectChanges();
        },
        error: (err) => {
          console.error('Error changing rooms:', err);
          this.handleLoadingError('Failed to change rooms');
        },
      })
    );
  }

  onBookingConfirmed(updatedRooms: Room[]): void {
    if (updatedRooms.length > 0 && this.detailedRoom) {
      this.detailedRoom = { ...updatedRooms[0] };
      this.statusChanged.emit(this.detailedRoom);
      this.messageService.add({
        severity: 'success',
        summary: 'Booking Confirmed',
        detail: `Room ${this.detailedRoom.roomNumber} has been booked`,
      });

      // Reload room details to get the new booking and guest info
      this.loadCompleteRoomDetails(this.detailedRoom.id!);
    }
    this.openForm = false;
    this.cdRef.detectChanges();
  }

  onBookingComplete(booking: Booking): void {
    this.isLoading = true;

    // Update the room status
    if (
      this.detailedRoom &&
      booking.rooms.includes(this.detailedRoom.id as number)
    ) {
      const newStatus: RoomStatus =
        booking.status === 'CHECKED_IN' ? 'OCCUPIED' : 'BOOKED';
      const updatedRoom: Room = {
        ...this.detailedRoom,
        roomStatus: newStatus,
      };

      this.hotelService.updateRoom(updatedRoom.id!, updatedRoom).subscribe({
        next: () => {
          this.detailedRoom = updatedRoom;
          this.statusChanged.emit(updatedRoom);
          this.messageService.add({
            severity: 'success',
            summary: 'Booking Complete',
            detail: `Room ${updatedRoom.roomNumber} status updated to ${newStatus}`,
          });
          this.openForm = false;
          this.isLoading = false;

          // Reload room details to get the new booking info
          this.loadCompleteRoomDetails(updatedRoom.id!);
        },
        error: (err) => {
          this.isLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update room status',
          });
        },
      });
    } else {
      this.isLoading = false;
      this.openForm = false;
    }
  }

  onCheckinComplete(updatedRoom: Room): void {
    this.updateRoomInUI(updatedRoom);
    this.messageService.add({
      severity: 'success',
      summary: 'Check-in Complete',
      detail: `Room ${updatedRoom.roomNumber} is now occupied`,
    });
    this.openCheckinForm = false;
    this.cdRef.detectChanges();
  }

  onCheckoutComplete(updatedRoom: Room): void {
    this.updateRoomInUI(updatedRoom);
    // Clear guest and booking info after checkout
    this.currentGuest = null;
    this.currentBooking = null;
    this.messageService.add({
      severity: 'success',
      summary: 'Checkout Complete',
      detail: `Room ${updatedRoom.roomNumber} has been marked for cleaning`,
    });
    this.openMessage = false;
    this.cdRef.detectChanges();
  }

  onStayExtended(event: any): void {
    if (!this.currentBooking) return;

    // Update the booking with new checkout date
    const updatedBooking: Booking = {
      ...this.currentBooking,
      checkoutDate: event.checkoutDate,
    };

    this.subscriptions.add(
      this.hotelService
        .updateBooking(this.currentBooking.id!, updatedBooking)
        .subscribe({
          next: (booking) => {
            this.currentBooking = booking;
            this.messageService.add({
              severity: 'success',
              summary: 'Stay Extended',
              detail: `Stay extended until ${event.checkoutDate}`,
            });
            this.openExtendStay = false;
            this.cdRef.detectChanges();
          },
          error: (err) => {
            console.error('Error extending stay:', err);
            this.handleLoadingError('Failed to extend stay');
          },
        })
    );
  }

  private updateRoomInUI(updatedRoom: Room): void {
    this.detailedRoom = updatedRoom;
    this.statusChanged.emit(updatedRoom);
  }

  public loadRoomDetails(roomId: number): void {
    this.isLoading = true;
    this.showDetails = true;

    forkJoin([
      this.hotelService.getRoom(roomId),
      this.hotelService.getBookings(),
      this.hotelService.getGuests(),
      this.hotelService.getMaintenanceRequests(),
    ]).subscribe({
      next: ([room, bookings, guests, maintenanceRequests]) => {
        this.detailedRoom = room;

        // Find booking for this room
        const booking = bookings.find((b) => b.rooms.includes(roomId));
        if (booking) {
          this.currentBooking = booking;

          // Find guest for this booking
          if (typeof booking.guest === 'number') {
            this.currentGuest =
              guests.find((g) => g.id === booking.guest) || null;
          } else {
            this.currentGuest = booking.guest as Guest;
          }
        } else {
          this.currentBooking = null;
          this.currentGuest = null;
        }

        // Load maintenance requests for this room
        this.maintenanceRequests = maintenanceRequests.filter(
          (req) => req.room === roomId && !req.completed
        );

        this.isLoading = false;
        this.cdRef.detectChanges();
      },
      error: (err) => {
        console.error('Error loading room details:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load room details',
        });
        this.isLoading = false;
        this.cdRef.detectChanges();
      },
    });
  }

  showRoomDetailsModal(room: Room): void {
    if (!room || !room.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Invalid room information',
      });
      return;
    }

    this.isLoading = true;
    this.hotelService.getRoom(room.id).subscribe({
      next: (detailedRoom) => {
        this.detailedRoom = detailedRoom;
        this.isLoading = false;

        // Load additional data if needed (bookings, guests, etc.)
        if (
          detailedRoom.roomStatus === 'BOOKED' ||
          detailedRoom.roomStatus === 'OCCUPIED'
        ) {
          this.loadBookingAndGuestDetails(room.id);
        }
      },
      error: (err) => {
        console.error('Error loading room details:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load room details',
        });
        this.isLoading = false;
      },
    });
  }

  private loadBookingAndGuestDetails(roomId: number): void {
    forkJoin([
      this.hotelService.getBookings(),
      this.hotelService.getGuests(),
    ]).subscribe({
      next: ([bookings, guests]) => {
        // Find booking for this room
        const booking = bookings.find((b) => b.rooms.includes(roomId));
        if (booking) {
          this.currentBooking = booking;

          // Find guest for this booking
          if (typeof booking.guest === 'number') {
            this.currentGuest =
              guests.find((g) => g.id === booking.guest) || null;
          } else {
            this.currentGuest = booking.guest as Guest;
          }
        }
      },
      error: (err) => {
        console.error('Error loading booking/guest details:', err);
      },
    });
  }
}
