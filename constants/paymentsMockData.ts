export type PaymentMethod = 'gpay' | 'phonepe' | 'paytm' | 'upi' | 'cash' | 'qr';
export type PaymentStatus = 'recorded' | 'pending' | 'failed';

export interface PaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  membershipPlan: string;
  duration: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  time: string;
  status: PaymentStatus;
  transactionId?: string;
}

export const mockPayments: PaymentRecord[] = [
  {
    id: 'pay_1',
    memberId: 'MEM1256',
    memberName: 'Rahul Sharma',
    membershipPlan: 'Gold',
    duration: '1 Month',
    amount: 3999,
    method: 'gpay',
    date: '29 Jul 2026',
    time: '6:42 PM',
    status: 'recorded',
    transactionId: 'AXF89HJY2K',
  },
  {
    id: 'pay_2',
    memberId: 'MEM1257',
    memberName: 'Ankit Verma',
    membershipPlan: 'Silver',
    duration: '1 Month',
    amount: 1999,
    method: 'phonepe',
    date: '29 Jul 2026',
    time: '5:15 PM',
    status: 'recorded',
    transactionId: 'PHN8945KLM',
  },
  {
    id: 'pay_3',
    memberId: 'MEM1258',
    memberName: 'Priya Singh',
    membershipPlan: 'Gold',
    duration: '1 Month',
    amount: 3999,
    method: 'paytm',
    date: '29 Jul 2026',
    time: '3:30 PM',
    status: 'recorded',
    transactionId: 'PYT9901XCV',
  },
  {
    id: 'pay_4',
    memberId: 'MEM1259',
    memberName: 'Mohit Kumar',
    membershipPlan: 'Platinum',
    duration: '1 Month',
    amount: 5999,
    method: 'phonepe',
    date: '29 Jul 2026',
    time: '1:20 PM',
    status: 'recorded',
    transactionId: 'PHN1122QWE',
  },
  {
    id: 'pay_5',
    memberId: 'MEM1260',
    memberName: 'Sneha Nair',
    membershipPlan: 'Silver',
    duration: '1 Month',
    amount: 1999,
    method: 'gpay',
    date: '29 Jul 2026',
    time: '11:45 AM',
    status: 'recorded',
    transactionId: 'AXF5544WER',
  },
  {
    id: 'pay_6',
    memberId: 'MEM1261',
    memberName: 'Aditya Patel',
    membershipPlan: 'Gold',
    duration: '1 Month',
    amount: 3999,
    method: 'gpay',
    date: '29 Jul 2026',
    time: '10:10 AM',
    status: 'recorded',
    transactionId: 'AXF9988YYU',
  },
  {
    id: 'pay_7',
    memberId: 'MEM1262',
    memberName: 'Vikram Singh',
    membershipPlan: 'Silver',
    duration: '1 Month',
    amount: 1999,
    method: 'gpay',
    date: '28 Jul 2026', // Yesterday
    time: '4:20 PM',
    status: 'recorded',
    transactionId: 'AXF7766OOI',
  },
  {
    id: 'pay_8',
    memberId: 'MEM1263',
    memberName: 'Rohit Jain',
    membershipPlan: 'Gold',
    duration: '1 Month',
    amount: 3999,
    method: 'paytm',
    date: '28 Jul 2026', // Yesterday
    time: '8:30 PM',
    status: 'recorded',
    transactionId: 'PYT4433RTY',
  }
];

export const mockMembers = [
  { id: 'MEM1256', name: 'Rahul Sharma', phone: '+91 9876543210' },
  { id: 'MEM1257', name: 'Ankit Verma', phone: '+91 8765432109' },
  { id: 'MEM1258', name: 'Priya Singh', phone: '+91 7654321098' },
  { id: 'MEM1259', name: 'Mohit Kumar', phone: '+91 6543210987' },
  { id: 'MEM1260', name: 'Sneha Nair', phone: '+91 5432109876' },
];

export const mockPlans = [
  { id: 'silver', name: 'Silver Membership', duration: '1 Month', price: 1999 },
  { id: 'gold', name: 'Gold Membership', duration: '1 Month', price: 3999 },
  { id: 'platinum', name: 'Platinum Membership', duration: '1 Month', price: 5999 },
];
