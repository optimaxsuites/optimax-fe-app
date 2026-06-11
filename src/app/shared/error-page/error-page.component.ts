import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-page.component.html',
  styleUrls: ['./error-page.component.scss']
})
export class ErrorPageComponent implements OnInit {
  errorCode: string = '500';
  errorTitle: string = 'Server Error';
  errorMessage: string = 'Something went wrong on our end.';
  errorIcon: string = '⚠️';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.errorCode = params['code'] || '500';
      this.setErrorDetails(this.errorCode);
    });
  }

  setErrorDetails(code: string): void {
    const errorMap: { [key: string]: { title: string; message: string; icon: string } } = {
      '404': {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist or has been moved.',
        icon: '🔍'
      },
      '401': {
        title: 'Unauthorized',
        message: 'You need to log in to access this page.',
        icon: '🔒'
      },
      '403': {
        title: 'Access Forbidden',
        message: 'You do not have permission to access this page.',
        icon: '⛔'
      },
      '500': {
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        icon: '⚠️'
      }
    };

    const details = errorMap[code] || errorMap['500'];
    this.errorTitle = details.title;
    this.errorMessage = details.message;
    this.errorIcon = details.icon;
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goBack(): void {
    window.history.back();
  }
}
