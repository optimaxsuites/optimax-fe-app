export interface RotationDTO {
  id: string;
  name: string;
  shifts: string[]; // shiftIds
  cycleLength: number; // days or weeks
}