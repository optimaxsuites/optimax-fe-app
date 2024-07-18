import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-verify-token',
  templateUrl: './verify-token.component.html',
  styleUrl: './verify-token.component.scss'
})
export class VerifyTokenComponent {

  token: string | null = null;

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token');
    console.log(this.token); // You can use the token here
  }

}
