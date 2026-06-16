import { Injectable } from '@angular/core';
import { BusinessType } from '../models/enums';

@Injectable({
  providedIn: 'root',
})
export class IndustryDataService {
  // #businessType = BusinessType.GENERIC
  #localStorageBusinessTypeEntry = 'businessType';

  constructor() {}

  set businessType(val: BusinessType) {
    // this.#businessType = val
    localStorage.setItem(
      this.#localStorageBusinessTypeEntry,
      JSON.stringify(val)
    );
  }

  get businessType() {
    // return this.#businessType
    return JSON.parse(
      localStorage.getItem(this.#localStorageBusinessTypeEntry) ??
        JSON.stringify(`${BusinessType.PHARMACY}`)
    );
  }
}
