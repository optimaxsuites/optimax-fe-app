import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'erp-expenses';

  constructor() {}

  ngOnInit(): void {
    // The expense module is lazy-loaded inside the main ERP shell.
    // It must reuse the parent session instead of starting its own login flow.
  }
}
