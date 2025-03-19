
// productivity.component.ts
import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-productivity',
  templateUrl: './productivity.component.html',
  styleUrls: ['./productivity.component.scss']
})
export class ProductivityComponent {

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

navigate(path: string) {
  this.router.navigate([path]).then(() => {
    this.cdr.detectChanges()
  });
}

}