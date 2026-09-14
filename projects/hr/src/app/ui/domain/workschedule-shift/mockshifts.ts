import { WorkShiftDTO } from "./shift.dto";

export const MOCK_SHIFTS: WorkShiftDTO[] = [
  {
    id: 'shift-1',
    name: 'Morning Shift',
    type: 'morning',
    startTime: '08:00',
    endTime: '16:00',
    //department: 'Operations',
    description: 'loremipsumtoolazytothinksomethignup',
    color: '#4CAF50'
  },
  {
    id: 'shift-2',
    name: 'Evening Shift',
    type: 'evening',
    startTime: '16:00',
    endTime: '23:00',
    //department: 'Operations',
    description: 'loremipsumtoolazytothinksomethignup',
    color: '#FF9800'
  }
];