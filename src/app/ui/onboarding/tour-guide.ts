import { Component, input, output, computed, ChangeDetectionStrategy } from "@angular/core";
import { NgStyle } from "@angular/common"; // FIX: NgStyle must be imported from @angular/common for standalone components

// --- ERP Application Core Types and Data ---

type AppView = 'dashboard' | 'inventory' | 'settings';
const ONBOARDING_KEY = 'erp_onboarding_completed_v3';

export interface TourStep {
  elementId: string;
  view: AppView; 
  title: string;
  description: string;
  position: 'top-right' | 'bottom-left' | 'top-center' | 'bottom-center' | 'bottom-right' | 'top-left';
}

export const TOUR_STEPS: TourStep[] = [
  {
    elementId: 'dashboard-header',
    view: 'dashboard',
    title: 'Welcome to your ERP!',
    description: "This is your centralized control panel. All operations begin here. Note the current status.",
    position: 'top-right'
  },
  {
    elementId: 'side-nav-inventory',
    view: 'dashboard',
    title: 'Access Modules',
    description: "Use the left sidebar to navigate to key modules like Inventory, Finance, and HR.",
    position: 'top-left'
  },
  {
    elementId: 'inventory-list-header',
    view: 'inventory',
    title: 'Inventory Management',
    description: "This view shows all your current stock. Let's see how to add a new item.",
    position: 'top-right'
  },
  {
    elementId: 'inventory-add-button',
    view: 'inventory',
    title: 'Perform Critical Actions',
    description: "This is where you execute core functions. Click 'Add Item' to start your first process.",
    position: 'bottom-center'
  },
  {
    elementId: 'side-nav-settings',
    view: 'inventory',
    title: 'Your Next Step: Setup',
    description: "Before going live, navigate to Settings to connect your payment gateway and complete user roles.",
    position: 'bottom-left'
  },
  {
    elementId: 'settings-integrations',
    view: 'settings', 
    title: 'System Integrations',
    description: "Connect to external tools (e.g., QuickBooks, Slack) here to unlock advanced reporting features.",
    position: 'bottom-center'
  },
  {
    elementId: 'settings-card',
    view: 'settings',
    title: 'Tour Complete!',
    description: "You now know the main areas of the app and the steps to unlock all modules. Happy managing!",
    position: 'top-center'
  },
];


// --- Tour Guide Component (Refactored) ---

@Component({
  selector: 'app-tour-guide',
  standalone: false, 
  changeDetection: ChangeDetectionStrategy.OnPush, 

  // Template updated to use @if control flow and signal access (e.g., steps() instead of steps)
  template: `
    @if (currentStepData(); as step) {
      <div 
        class="fixed z-[100] p-6 rounded-xl shadow-2xl bg-white text-gray-600 max-w-xs transition-all duration-300 pointer-events-auto border border-customBlue/50"
        [style.left.px]="position().left"
        [style.top.px]="position().top"
        [ngStyle]="currentStepStyle()"
      >
        <div class="flex justify-between items-start mb-2">
          <!-- Step Counter -->
          <span class="text-xs font-bold text-white bg-customBlue px-2 py-1 rounded-full">
            Step {{ currentStep() + 1 }} of {{ steps().length }}
          </span>
          <!-- Skip Button -->
          <button (click)="skipTour.emit()" class="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <h3 class="text-xl font-extrabold mb-2">{{ step.title }}</h3>
        <p class="text-sm text-gray-600 mb-4">{{ step.description }}</p>
        
        <div class="flex justify-between items-center pt-2 border-t border-gray-100">
          <!-- Previous Button -->
          <button 
            (click)="prevStep.emit()"
            [disabled]="currentStep() === 0"
            class="text-sm font-medium px-3 py-1 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-customBlue hover:bg-customBlue"
          >
            &#8592; Previous
          </button>
          
          <!-- Next/Finish Button -->
          <button 
            (click)="nextStep.emit()"
            class="bg-customBlue text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-customBlue transition active:scale-95 transform"
          >
            {{ isLastStep() ? 'Finish Tour' : 'Next Step' }} &#8594;
          </button>
        </div>
      </div>
    }
  `,
})
export class TourGuideComponent {
  // Inputs using the new functional input syntax (signals)
  steps = input.required<TourStep[]>();
  currentStep = input.required<number>();
  position = input.required<{ left: number; top: number }>();
  
  // Outputs using the new functional output syntax
  nextStep = output<void>();
  prevStep = output<void>();
  skipTour = output<void>();
  
  // Computed signals access input signals using parentheses (e.g., steps())
  currentStepData = computed(() => this.steps()[this.currentStep()]);
  isLastStep = computed(() => this.currentStep() === this.steps().length - 1);

  /**
   * Calculates the CSS transform needed to position the guide box relative to 
   * the parent-calculated absolute position (left/top) based on the step's 
   * desired position around the target element. The 1rem offset ensures a gap.
   */
  currentStepStyle(): { [key: string]: string } {
    const pos = this.currentStepData().position;
    
    // Simple offsets to position the guide adjacent to the target
    if (pos === 'bottom-left') return { transform: 'translate(1rem, 1rem)' };
    if (pos === 'bottom-center') return { transform: 'translate(-50%, 1rem)' };
    if (pos === 'bottom-right') return { transform: 'translate(calc(-100% - 1rem), 1rem)' };
    if (pos === 'top-center') return { transform: 'translate(-50%, calc(-100% - 1rem))' };
    
    // Default / top-right
    return { transform: 'translate(1rem, calc(-100% - 1rem))' }; 
  }
}