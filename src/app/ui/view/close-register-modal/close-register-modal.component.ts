import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-close-register-modal',
  templateUrl: './close-register-modal.component.html',
  styleUrls: ['./close-register-modal.component.scss'],
})
export class CloseRegisterModalComponent {
  @Input() openingAmount: number = 0; // Opening balance passed from parent
   @Input() closeAmount: number | null = null; // User input for close amount
  @Output() finalizeRegisterEvent = new EventEmitter<any>();
  @Output() closeModalEvent = new EventEmitter<void>();

  denominations = [1000, 500, 200, 100, 50, 20, 10, 5];
  denominationCounts: { [key: number]: number } = {};

  cashCountTotal: number = 0; // Total cash count calculated from denominations
  salesTotal: number = 0; // Dynamically calculated sales total
  canFinalize: boolean = false; // Controls whether the finalize button is enabled
  errorMessage: string | null = null; // Error message for validation
  isDenominationsConfirmed: boolean = false; // Tracks if denominations are confirmed

  ngOnInit(): void {
    // Initialize denomination counts
    this.denominations.forEach((denom) => {
      this.denominationCounts[denom] = 0;
    });
  }

  calculateCashCountTotal(): void {
    // Calculate the total cash count from denominations
    this.cashCountTotal = Object.entries(this.denominationCounts).reduce(
      (sum, [denom, count]) => sum + Number(denom) * (count || 0),
      0
    );
  }

  validateDenominations(): void {
    // Validate if closeAmount matches cashCountTotal
    this.calculateCashCountTotal();

    if (this.closeAmount === this.cashCountTotal) {
      this.errorMessage = null;
      this.isDenominationsConfirmed = true;
      this.canFinalize = true;

      // Calculate salesTotal dynamically
      this.salesTotal = this.closeAmount - this.openingAmount;
    } else {
      this.errorMessage = `Mismatch: Close Amount (₦${this.closeAmount?.toLocaleString()}) does not match Cash Count Total (₦${this.cashCountTotal.toLocaleString()})`;
      this.isDenominationsConfirmed = false;
      this.canFinalize = false;
    }
  }

  finalizeRegister(): void {
    if (!this.canFinalize) return;

    const registerData = {
      openingAmount: this.openingAmount,
      salesTotal: this.salesTotal,
      closeAmount: this.closeAmount,
      cashCount: this.denominationCounts,
      cashCountTotal: this.cashCountTotal,
      timestamp: new Date(),
    };

    this.finalizeRegisterEvent.emit(registerData);
  }

  closeModal(): void {
    this.closeModalEvent.emit();
  }
}