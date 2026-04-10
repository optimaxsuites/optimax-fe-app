import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { SmtpConfigService } from '../../../service/smtp-config.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-smtp-setup',
  templateUrl: './smtp-setup.component.html',
  styleUrl: './smtp-setup.component.scss'
})
export class SmtpSetupComponent implements OnInit {
  smtpForm: FormGroup;
  loading = false;
  response: any;

  constructor(
    private fb: FormBuilder,
    private smtpService: SmtpConfigService,
    private messageService: MessageService
  ) {
    this.smtpForm = this.fb.group({
      name: ['', Validators.required],
      host: ['', Validators.required],
      port: [587, Validators.required],
      username: ['', Validators.required],
      password: ['', Validators.required],
      protocol: ['SMTP', Validators.required],
      authEnabled: [true],
      startTlsEnabled: [true],
      sslEnabled: [false],
      fromAddress: ['', [Validators.required, Validators.email]],
      connectionTimeoutMs: [5000],
      timeoutMs: [5000],
      writeTimeoutMs: [5000],
      active: [true]
    });
  }

  ngOnInit() {
    this.smtpService.getConfig().subscribe({
      next: (config) => {
        console.log(config[config.length -1])
        this.smtpForm.patchValue(config[config.length -1]);
      },
      error: (err) => {
        console.log(err);
      }
    });
  }

  submit() {
    if (this.smtpForm.invalid) {
      this.smtpForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.smtpService.createConfig(this.smtpForm.value).subscribe({
      next: (res) => {
        this.response = res;
        this.loading = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'SMTP Configuration saved successfully', key: 'tl'});
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save SMTP Configuration', key: 'tl' });
      }
    });
  }
}
