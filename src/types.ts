export enum EntryType {
  DEPOSIT = 'DEPOSIT',
  TIP = 'TIP',
  CREDIT = 'CREDIT',
}

export interface CashEntry {
  id: string;
  type: EntryType;
  amount: number;
  cashier?: string;
  company?: string;
  observation?: string;
  cashCredit?: boolean; // crédito en efectivo – se resta de la meta
  denominations?: number; // depósito: denominación única usada (e.g. 20000)
  date: string; // ISO string
  time: string; // HH:mm
}

export const CLP_DENOMINATIONS = [20000, 10000, 5000, 2000, 1000, 500, 100, 50, 10] as const;

export function formatDenominations(denom?: number): string {
  if (!denom) return '';
  return denom.toLocaleString('es-CL');
}

export interface Company {
  id: string;
  name: string;
  rut: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  type: 'truck' | 'car' | 'pickup';
  companyId: string;
}

export interface ShiftRecord {
  id: string;
  closedAt: string; // ISO string
  date: string; // shift date
  zAmount: number;
  tipsTotal: number;
  cashDrawer: number;
  depositsTotal: number;
  efectivoReal: number;
  meta: number;
  diferencia: number;
  status: 'cuadrada' | 'sobrante' | 'faltante';
  entries: CashEntry[];
}

export interface CustomShiftType {
  id: string;
  label: string;
  short: string;
  color: string; // tailwind bg class
  textColor: string; // tailwind text class
  hours: boolean; // whether this shift counts work hours
  defaultHours: number;
  schedule?: string; // optional schedule description e.g. "06:00 - 14:00"
}

export interface DayShift {
  date: string;
  shift: string; // built-in key or custom shift id
  hours?: number;
}

export interface AppState {
  zAmount: number;
  tipsTotal: number;
  cashDrawer: number;
  entries: CashEntry[];
  companies: Company[];
  vehicles: Vehicle[];
  shifts: DayShift[];
  customShiftTypes: CustomShiftType[];
  shiftHistory: ShiftRecord[];
  shieldMode: boolean;
  weeklyHours: 44 | 42 | 40;
  /** @deprecated Use per-day hours in DayShift instead */
  shiftDuration: 7.5 | 6.5;
  notificationsEnabled: boolean;
  notificationTime: string; // HH:mm format
}

export const defaultAppState: AppState = {
  zAmount: 0,
  tipsTotal: 0,
  cashDrawer: 0,
  entries: [],
  companies: [],
  vehicles: [],
  shifts: [],
  customShiftTypes: [],
  shiftHistory: [],
  shieldMode: false,
  weeklyHours: 44,
  shiftDuration: 7.5,
  notificationsEnabled: false,
  notificationTime: '20:00',
};
