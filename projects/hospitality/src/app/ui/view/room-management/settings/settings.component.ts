import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  brandForm!: FormGroup;
  logoPreview: string | null = null;
  activeTab: 'brand' | 'config' = 'brand';
  uuid = 'optimax';

  socialIcons = [
    { name: 'Facebook', icon: 'fa-brands fa-facebook', placeholder: 'https://facebook.com/...' },
    { name: 'Instagram', icon: 'fa-brands fa-instagram', placeholder: 'https://instagram.com/...' },
    { name: 'Twitter/X', icon: 'fa-brands fa-x-twitter', placeholder: 'https://twitter.com/...' },
    { name: 'LinkedIn', icon: 'fa-brands fa-linkedin', placeholder: 'https://linkedin.com/...' },
    { name: 'WhatsApp', icon: 'fa-brands fa-whatsapp', placeholder: '+234...' }
  ];

  constructor(private fb: FormBuilder, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.uuid =
      this.route.snapshot.paramMap.get('uuid') ||
      localStorage.getItem('tenantId') ||
      'optimax';
    this.initForm();
    this.loadSettings();
  }

  private initForm(): void {
    this.brandForm = this.fb.group({
      companyName: ['OptimaxHospitality'],
      footerDescription: ['Redefining hospitality booking in Nigeria through AI-driven search and minimalist design.'],
      facebook: [''],
      instagram: [''],
      twitter: [''],
      linkedin: [''],
      whatsapp: [''],
      logoPosition: ['left'], // left, center
    });
  }

  private loadSettings(): void {
    const saved = localStorage.getItem('optimax_settings');
    if (saved) {
      const data = JSON.parse(saved);
      this.brandForm.patchValue(data);
      this.logoPreview = data.logo || null;
    }
  }

  onLogoUpload(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  saveSettings(): void {
    const data = {
      ...this.brandForm.value,
      logo: this.logoPreview,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('optimax_settings', JSON.stringify(data));
    alert('Settings saved successfully!');
    // Ideally use a toast service here
  }

  resetLogo(): void {
    this.logoPreview = null;
  }
}
