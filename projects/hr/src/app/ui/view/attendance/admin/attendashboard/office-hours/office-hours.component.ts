import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { OfficeHoursService } from '../../../../../service/attendance/office-hours.service';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import * as L from 'leaflet';

function officeHoursValidator(control: AbstractControl): ValidationErrors | null {

  const opening = control.get('openingTime')?.value;
  const grace = control.get('latenessGracePeriod')?.value;
  const absent = control.get('absentTime')?.value;
  const closing = control.get('closingTime')?.value

  if (!opening || !grace || !absent || !closing) return null;

  const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const [openMin, graceMin, absentMin, closeMin] = [opening, grace, absent, closing].map(toMinutes);
  return (openMin <= graceMin && graceMin <= absentMin && absentMin <= closeMin) ? null : { invalidOfficeHours: true };
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


  constructor(
    private fb: FormBuilder,
    private officeHoursService: OfficeHoursService
  ) {}

  ngOnInit() {
  this.form = this.fb.group({
    openingTime: ['09:00'],
    closingTime: ['17:00'],
    absentTime: ['10:00'],
    latenessGracePeriod: ['09:15'],
    lat: [null],
    lng: [null]
  },
  { validators: officeHoursValidator });

  this.officeHoursService.fetchCurrentOfficeHours()
  .subscribe({
    next: (res) => {
      this.officeHoursService.officeHoursId = res.id ?? null;

      const formatTime = (time: any) => {
        if (!time) return '09:00';
        if (typeof time === 'string') return time;
        return `${String(time.hour || 0).padStart(2, '0')}:${String(time.minute || 0).padStart(2, '0')}`;
      };

      const hours = {
        openingTime: formatTime(res.openingTime),
        closingTime: formatTime(res.closingTime),
        absentTime: formatTime(res.absentTime),
        latenessGracePeriod: formatTime(res.latenessGracePeriod),
        companyLatitude: Number(res.companyLatitude) || 0,
        companyLongitude: Number(res.companyLongitude) || 0
      };

      this.companyLatitude = hours.companyLatitude;
      this.companyLongitude = hours.companyLongitude;

      this.form.patchValue({
        openingTime: hours.openingTime,
        closingTime: hours.closingTime,
        absentTime: hours.absentTime,
        latenessGracePeriod: hours.latenessGracePeriod,
        lat: hours.companyLatitude,
        lng: hours.companyLongitude
      });
    },
    error: (err) => {
      console.error('Failed to load office hours:', err);
    }
  });
}

openLocationPicker() {
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

    this.form.patchValue({
    lat: pos.lat,
    lng: pos.lng
  });
  });

  //to force map to render inside modal
  setTimeout(() => {
    this.pickerMap.invalidateSize(true);
  }, 300);
}

updateMapFromInputs() {
  const lat = this.form.get('lat')?.value;
  const lng = this.form.get('lng')?.value;

  if (!this.pickerMap || !this.marker) {
    return;
  }

  if (lat == null || lng == null) return;

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    alert('Invalid coordinates');
    return;
  }

  this.pickedLat = lat;
  this.pickedLng = lng;

  this.marker.setLatLng([lat, lng]);
  this.pickerMap.setView([lat, lng], 15);
}

useCurrentLocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    // update form
    this.form.patchValue({
      lat: lat,
      lng: lng
    });

    // update map
    this.marker.setLatLng([lat, lng]);
    this.pickerMap.setView([lat, lng], 15);

    this.pickedLat = lat;
    this.pickedLng = lng;
  });
}

savePickedLocation() {
  const lat = this.form.get('lat')?.value;
  const lng = this.form.get('lng')?.value;

  if (lat == null || lng == null) return;

  this.companyLatitude = lat;
  this.companyLongitude = lng;

  this.closeLocationPicker();
}

closeLocationPicker() {
  this.locationPickerOpen = false;
}

save() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

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
    companyLatitude: undefined,
    companyLongitude: undefined
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
