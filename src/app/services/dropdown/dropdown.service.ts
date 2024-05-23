import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DropdownService {

  private dropdownOpenSubjects: { [key: string]: BehaviorSubject<boolean> } = {};
  private selectedItemSubjects: { [key: string]: BehaviorSubject<string | null> } = {};

  isDropdownOpen$(id: string) {
    if (!this.dropdownOpenSubjects[id]) {
      this.dropdownOpenSubjects[id] = new BehaviorSubject<boolean>(false);
    }
    return this.dropdownOpenSubjects[id].asObservable();
  }

  getSelectedItem$(id: string) {
    if (!this.selectedItemSubjects[id]) {
      this.selectedItemSubjects[id] = new BehaviorSubject<string | null>(null);
    }
    return this.selectedItemSubjects[id].asObservable();
  }

  toggleDropdown(id: string) {
    if (!this.dropdownOpenSubjects[id]) {
      this.dropdownOpenSubjects[id] = new BehaviorSubject<boolean>(false);
    }
    this.dropdownOpenSubjects[id].next(!this.dropdownOpenSubjects[id].value);
  }

  selectItem(id: string, item: string) {
    if (!this.selectedItemSubjects[id]) {
      this.selectedItemSubjects[id] = new BehaviorSubject<string | null>(null);
    }
    this.selectedItemSubjects[id].next(item);
    this.dropdownOpenSubjects[id].next(false);
  }
}
