export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  groupId: string;
  groupIds: string[];
  role: 'admin' | 'user';
  status?: 'active' | 'blocked';
  aiSharingEnabled?: boolean;
  aiMonthsLookback?: number;
  createdAt: any;
  updatedAt?: any;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  inviteCode: string;
  status: 'pending' | 'active';
  budget?: number;
  categoryBudgets?: Record<string, number>;
  customCategories?: string[];
  createdAt: any;
}

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Otros';

export interface RecurringExpense {
  id: string;
  groupId: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  dayOfMonth: number;
  paymentMethod: PaymentMethod;
  active: boolean;
  endDate?: string; // Format: YYYY-MM-DD
  status?: 'active' | 'finished';
  lastProcessedMonth?: string; // Format: YYYY-MM
  createdAt: any;
}

export interface Transaction {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  paymentMethod?: PaymentMethod;
  isRecurring?: boolean;
  recurringId?: string;
  date: any;
  createdAt: any;
}

export interface SavingsGoal {
  id: string;
  groupId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // Format: YYYY-MM-DD
  icon?: string;
  color?: string;
  createdAt: any;
}

export type TransactionType = 'income' | 'expense';

export const PAYMENT_METHODS: PaymentMethod[] = ['Efectivo', 'Tarjeta', 'Transferencia', 'Otros'];

export const CATEGORIES = {
  income: ['Salario', 'Venta', 'Regalo', 'Inversión', 'Otros'],
  expense: ['Comida', 'Transporte', 'Vivienda', 'Servicios', 'Salud', 'Educación', 'Entretenimiento', 'Compras', 'Otros']
};
