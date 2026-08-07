import { useMutation } from '@tanstack/react-query';
import { markAttendance } from '@/helpers/attendance/attendanceHelper';

export function useMarkAttendance() {
  return useMutation({
    mutationFn: ({ qrString, customerId }: { qrString: string; customerId: string }) => 
      markAttendance(qrString, customerId),
  });
}
