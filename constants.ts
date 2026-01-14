import { BirdType, Flock, FlockStatus, InventoryCategory, InventoryItem, Customer, SalesOrder, Transaction, Budget, Employee, HrTask, AppNotification, FarmProfile } from './types';

export const DEFAULT_FARM_PROFILE: FarmProfile = {
  name: 'My Poultry Farm',
  address: '',
  city: '',
  phone: '',
  email: '',
  currencySymbol: '$',
  taxRateDefault: 0,
  latitude: 0,
  longitude: 0
};

export const MOCK_FLOCKS: Flock[] = [];
export const MOCK_INVENTORY: InventoryItem[] = [];
export const MOCK_CUSTOMERS: Customer[] = [];
export const MOCK_ORDERS: SalesOrder[] = [];
export const MOCK_TRANSACTIONS: Transaction[] = [];
export const MOCK_BUDGETS: Budget[] = [];
export const MOCK_EMPLOYEES: Employee[] = [];
export const MOCK_TASKS: HrTask[] = [];
export const MOCK_NOTIFICATIONS: AppNotification[] = [];

export const NAV_ITEMS = [
  { id: 'DASHBOARD', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'FLOCK_LIST', label: 'Flock Management', icon: 'Bird' },
  { id: 'FEED', label: 'Inventory & Feed', icon: 'Wheat' },
  { id: 'HEALTH', label: 'Health & Vet', icon: 'Stethoscope' },
  { id: 'SALES', label: 'Sales & CRM', icon: 'ShoppingBag' },
  { id: 'HR', label: 'HR & Payroll', icon: 'Users' },
  { id: 'FINANCE', label: 'Finance', icon: 'DollarSign' },
];