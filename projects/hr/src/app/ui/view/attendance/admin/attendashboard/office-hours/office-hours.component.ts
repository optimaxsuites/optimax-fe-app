import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { OfficeHoursService /*ScheduleMode*/ } from '../../../../../service/attendance/office-hours.service';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import * as L from 'leaflet';

function officeHoursValidator(control: AbstractControl): ValidationErrors | null {

  const opening = control.get('openingTime')?.value;
  const grace = control.get('latenessGracePeriod')?.value;
  const absent = control.get('absentTime')?.value;
  const closing = control.get('closingTime')?.value

  if (!opening || !grace || !absent || !closing) return null;

  /*const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };*/

  const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const [openMin, graceMin, absentMin, closeMin] = [opening, grace, absent, closing].map(toMinutes);
  return (openMin <= graceMin && graceMin <= absentMin && absentMin <= closeMin) ? null : { invalidOfficeHours: true };

  /*const openMin = toMinutes(opening);
  const graceMin = toMinutes(grace);
  const absentMin = toMinutes(absent);
  const closeMin = toMinutes(closing);

  if (!(openMin <= graceMin && graceMin <= absentMin && absentMin <= closeMin)) {
    return { invalidOfficeHours: true };
  }

  return null;*/
}

@Component({
  selector: 'app-office-hours',
  templateUrl: './office-hours.component.html',
  styleUrl: './office-hours.component.scss'
})
export class OfficeHoursComponent implements OnInit{
  form!: FormGroup;
  editMode = false;
  companyName = '';
  companyLatitude: number | null = null;
  companyLongitude: number | null = null;

  locationPickerOpen = false;
  private pickerMap!: L.Map;
  private marker!: L.Marker;

  searchQuery = '';
  pickedLat!: number;
  pickedLng!: number;



  // The three modes the admin can choose from
  /*readonly scheduleModes: { value: ScheduleMode; label: string; description: string }[] = [
    {
      value: 'office-hours',
      label: 'Fixed Office Hours',
      description: 'All employees follow the same global schedule.'
    },
    {
      value: 'shift',
      label: 'Shift-Based',
      description: 'Employees follow their assigned shift from Work Schedules.'
    },
    {
      value: 'mixed',
      label: 'Mixed',
      description: 'Shift-assigned employees use their shift; all others use office hours.'
    }
  ];*/

  /*selectedMode!: ScheduleMode;*/


  constructor(
    private fb: FormBuilder,
    private officeHoursService: OfficeHoursService
  ) {}

  ngOnInit() {
    const hours = this.officeHoursService.getOfficeHours();
    /*this.selectedMode = this.officeHoursService.getScheduleMode();*/

    // Load saved company location
  this.companyName = hours.companyName ?? '';
  this.companyLatitude = hours.companyLatitude ?? null;
  this.companyLongitude = hours.companyLongitude ?? null;

    this.form = this.fb.group({
      openingTime: [hours.openingTime],
      closingTime: [hours.closingTime],
      absentTime: [hours.absentTime],
      latenessGracePeriod: [hours.latenessGracePeriod]
    },
    {validators: officeHoursValidator});
  }

  /*openLocationPicker() {
  this.locationPickerOpen = true;

  setTimeout(() => {
    this.initPickerMap();
    this.pickerMap?.invalidateSize();
  }, 300); //not 100, to give more time
}*/

openLocationPicker() {
  console.log('OPEN CLICKED');
  this.locationPickerOpen = true;

  setTimeout(() => {
    this.initPickerMap();

    // force proper rendering
    setTimeout(() => {
      this.pickerMap?.invalidateSize();
    }, 200);
  }, 200);
}

private initPickerMap() {
  const container = L.DomUtil.get('company-map');
  if (container != null) {
    (container as any)._leaflet_id = null;
  }


if(this.pickerMap) {
  this.pickerMap.off();
  this.pickerMap.remove();
}

  //to use saved location or fallback
  const lat = this.companyLatitude ?? 9.0765;
  const lng = this.companyLongitude ?? 7.3986;

  this.pickerMap = L.map('company-map').setView([lat, lng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(this.pickerMap);

  this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.pickerMap);

  //initialize picked values
  this.pickedLat = lat;
  this.pickedLng = lng;

  this.marker.on('dragend', () => {
    const pos = this.marker.getLatLng();
    this.pickedLat = pos.lat;
    this.pickedLng = pos.lng;
  });

  //to force map to render inside modal
  setTimeout(() => {
    this.pickerMap.invalidateSize(true);
  }, 300);
}

/*async searchLocation() {
  if (!this.searchQuery) return;

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(this.searchQuery)}&format=json&limit=1`
  );

  const data = await res.json();
  if (!data.length) return;

  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);

  this.pickerMap.setView([lat, lng], 15);
  this.marker.setLatLng([lat, lng]);

  this.pickedLat = lat;
  this.pickedLng = lng;
}*/

savePickedLocation() {
  if (this.pickedLat == null || this.pickedLng == null) {
    return; // prevent saving invalid location
  }

  this.companyLatitude = this.pickedLat;
  this.companyLongitude = this.pickedLng;

  this.closeLocationPicker();
}

closeLocationPicker() {
  this.locationPickerOpen = false;
}

    /*setMode(mode: ScheduleMode) {
    this.selectedMode = mode;
  }
//getter to replace modeLabel pipe
getModeLabel(modeValue: ScheduleMode): string {
  return this.scheduleModes.find(m => m.value === modeValue)?.label ?? modeValue;
}

  // Whether the office hours form is relevant given the selected mode
  get officeHoursRelevant(): boolean {
    return this.selectedMode === 'office-hours' || this.selectedMode === 'mixed';
  }*/

    save() {
    if (/*this.officeHoursRelevant &&*/ this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    /*this.officeHoursService.setScheduleMode(this.selectedMode);
    if (this.officeHoursRelevant) {
      this.officeHoursService.updateOfficeHours(this.form.value);
    }*/
    this.officeHoursService.updateOfficeHours({
      ...this.form.value,
    companyName: this.companyName,
    companyLatitude: this.companyLatitude,
    companyLongitude: this.companyLongitude
  });
    this.editMode = false;
  }

resetDefault() {
  const defaultHours = { 
    openingTime: '09:00', 
    closingTime: '17:00', 
    absentTime: '10:00', 
    latenessGracePeriod: '09:15',
    companyName: '',
    companyLatitude: /*null*/ undefined,
    companyLongitude: /*null*/ undefined 
  };
  this.form.setValue({
    openingTime: defaultHours.openingTime,
    closingTime: defaultHours.closingTime,
    absentTime: defaultHours.absentTime,
    latenessGracePeriod: defaultHours.latenessGracePeriod
  });
  this.companyName = '';
  this.companyLatitude = null;
  this.companyLongitude = null;
  this.officeHoursService.updateOfficeHours(defaultHours);
  this.editMode = false;
}


}
