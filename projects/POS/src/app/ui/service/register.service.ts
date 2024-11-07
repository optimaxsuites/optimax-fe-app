import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RegisterService {

  constructor() { }
  private closeRegisterSubject = new Subject<void>();

  closeRegister$ = this.closeRegisterSubject.asObservable();

  triggerCloseRegister() {
    this.closeRegisterSubject.next();
  }
}
