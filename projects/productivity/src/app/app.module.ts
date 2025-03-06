import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { ProductivityComponent } from './ui/view/productivity/productivity.component';
import { ProjectComponent } from './ui/view/productivity/components/project/project.component';

import { ReactiveFormsModule } from '@angular/forms';

import { NavTabComponent } from './ui/shared-component/view/nav-tab/nav-tab.component';
import { TargetComponent } from './ui/view/productivity/components/target/target.component';
import { SidebarComponent } from './ui/view/productivity/components/sidebar/sidebar.component';
import { ItemDetailComponent } from './ui/view/productivity/components/item-detail/item-detail.component';

// Ekemiben


import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { CalendarModule } from 'primeng/calendar';
import Aura from '@primeng/themes/aura';
import { EditorModule } from 'primeng/editor';
import { ProjectListComponent } from './ui/view/productivity/components/project-list/project-list.component';
// import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Accordion, AccordionModule } from 'primeng/accordion';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import {  ProgressBarModule } from 'primeng/progressbar';

import { MatExpansionModule } from '@angular/material/expansion';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import { BackButtonComponent } from './ui/shared-component/view/back-button/back-button.component';
import { NewTaskComponent } from './ui/view/productivity/components/new-task/new-task.component';

// Ekemiben
//
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule} from '@angular/forms';
import { ProjectViewComponent } from './ui/view/productivity/components/project-view/project-view.component';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
// import { DatePicker } from 'primeng/datepicker';


//



@NgModule({
   schemas: [CUSTOM_ELEMENTS_SCHEMA],
  declarations: [
    AppComponent,
    ProductivityComponent,
    TargetComponent,
    SidebarComponent,
    ItemDetailComponent,
    ProjectComponent,
    NavTabComponent,
    ProjectListComponent,
    BackButtonComponent,
    NewTaskComponent,
    ProjectViewComponent,
    NewTaskComponent,
    
   

  ],
  imports: [
   
    BrowserModule,
    AppRoutingModule,
    CommonModule,
    // AppRoutingModule,
    RouterModule,
    ReactiveFormsModule, // Add this here
    EditorModule,
    CalendarModule,
    // FontAwesomeModule,
    AccordionModule,
    IconFieldModule,
    InputIconModule,
    ProgressBarModule,
    MatExpansionModule,
    MatProgressBarModule,
     ButtonModule,  // ✅ PrimeNG Button
    DialogModule ,  // ✅ PrimeNG Dialog
     BrowserAnimationsModule,
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    FormsModule,
    DynamicDialogModule,
    InputTextModule,
    DropdownModule,
    InputNumberModule,
    MatTabsModule,
    
    
  
    
  ],
  providers: [DialogService,
    provideAnimationsAsync()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }









