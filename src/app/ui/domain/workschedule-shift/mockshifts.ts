import { ShiftDTO } from "./shift.dto";

export const MOCK_SHIFTS: ShiftDTO[] = [
  {
    id: '1',
    name: 'Morning Shift',
    startTime: '08:00',
    endTime: '16:00',
    breakTime: 60,
    department: 'Operations',
    description: 'loremipsumtoolazytothinksomethignup',
    color: '#4CAF50'
  },
  {
    id: '2',
    name: 'Evening Shift',
    startTime: '16:00',
    endTime: '23:00',
    breakTime: 45,
    department: 'Operations',
    description: 'loremipsumtoolazytothinksomethignup',
    color: '#FF9800'
  }
];