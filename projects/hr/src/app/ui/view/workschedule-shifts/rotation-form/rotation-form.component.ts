import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-rotation-form',
  templateUrl: './rotation-form.component.html',
  styleUrl: './rotation-form.component.scss'
})

export class RotationFormComponent implements OnInit {
  
  rotationForm!: FormGroup;

   constructor(
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {

    this.rotationForm = this.fb.group({
      name: [''],
      shifts: [[]],
      cycleLength: [1]
    });

  }

  get rotationPreview(): string[] {

  const shifts =
    this.rotationForm.value.shifts || [];

  return shifts.map(
    (shift: string, index: number) =>
      `Week ${index + 1} → ${shift}`
  );
}

}
