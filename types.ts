
export enum FlockStatus {
  ACTIVE = 'Active',
  HARVESTED = 'Harvested',
  QUARANTINE = 'Quarantine',
  PLANNED = 'Planned'
}

export enum BirdType {
  BROILER = 'Broiler',
  LAYER = 'Layer',
  BREEDER = 'Breeder'
}

export enum InventoryCategory {
  FEED = 'Feed',
  MEDICINE = 'Medicine',
  EQUIPMENT = 'Equipment',
  OTHER = 'Other'
}

export type ProductionStage = 'Starter' | 'Grower' | 'Finisher' | 'Chick' | 'Pullet' | 'Layer';

export interface EggGradeCount {
  large: number;
  medium: number;
  small: number;
}

export interface EggCollectionSession {
  good: EggGradeCount;
  damaged: number;
  recordedAt?: string;
}

export interface EggLogDetails {
  morning: EggCollectionSession;
  afternoon: EggCollectionSession;
}

export interface DailyLog {
  day: number;
  date: string;
  mortality: number;
  mortalityReason?: string; // Cause of death
  feedConsumedKg: number;
  waterConsumedL: number;
  avgWeightG: number;
  eggProduction?: number; // Total count for backward compatibility
  eggDetails?: EggLogDetails; // Detailed breakdown
  notes?: string;
  mortalityImage?: string; // Base64 string for proof
}

export interface HealthChecklistItem {
  id: string;
  task: string;
  isCompleted: boolean;
}

export type HealthRecordType = 'TREATMENT' | 'VACCINATION' | 'ISOLATION' | 'CHECKUP';

export interface MedicalRecord {
  id: string;
  date: string;
  type: HealthRecordType;
  title: string;
  description?: string;
  flockId: string;
  
  // Lifecycle tracking
  status?: 'OPEN' | 'RESOLVED';
  outcome?: string; // e.g., 'Recovered', 'Died'

  // Medication specific
  medicationName?: string;
  inventoryItemId?: string;
  quantityUsed?: number;
  cost?: number;
  dosage?: string;
  
  // Isolation specific
  birdsAffected?: number;
}

export interface Flock {
  id: string;
  name: string;
  batchId: string; // Batch Number Tracking
  type: BirdType; // Broiler vs Layer
  productionStage?: ProductionStage; // Categorization
  breed: string;
  house: string; // Housing Location
  source?: string; // Source of birds
  startDate: string; // Date of Arrival
  initialAgeDays?: number; // Initial Age
  initialCount: number; // Batch Size
  initialCost?: number; // Cost of acquisition
  vatRate?: number; // Purchase VAT %
  whtRate?: number; // Purchase WHT %
  currentCount: number;
  totalSold?: number; // Track birds sold to distinguish from mortality
  status: FlockStatus;
  logs: DailyLog[];
  healthChecklist?: HealthChecklistItem[];
  healthRecords?: MedicalRecord[];
}

// Equipment Specifics
export interface MaintenanceLog {
  id: string;
  date: string;
  type: 'Preventive' | 'Repair' | 'Inspection';
  description: string;
  cost: number;
  performedBy: string;
  nextDueDate?: string;
}

export interface UsageLog {
  id: string;
  date: string;
  durationHours: number;
  usedBy: string;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string; // kg, liters, bags, units
  minLevel: number; // Reorder point
  costPerUnit: number;
  lastUpdated: string;
  location?: string;
  notes?: string;
  targetBirdType?: BirdType; // Optional field for Feed items
  vatRate?: number;
  whtRate?: number;
  
  // Equipment Fields
  serialNumber?: string;
  model?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  maintenanceLogs?: MaintenanceLog[];
  usageLogs?: UsageLog[];
  nextMaintenanceDate?: string;
}

export interface DashboardMetrics {
  totalBirds: number;
  activeFlocks: number;
  totalFeedToday: number;
  mortalityRate: number;
}

export type ViewState = 'DASHBOARD' | 'FLOCK_LIST' | 'FLOCK_DETAIL' | 'FEED' | 'HEALTH' | 'FINANCE' | 'EGG_PRODUCTION' | 'SALES' | 'HR' | 'SETTINGS';

export interface AnalysisResult {
  analysis: string;
  recommendations: string[];
  alertLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// User Profile
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
}

// Sales & CRM Types

export interface Customer {
  id: string;
  name: string;
  type: 'WHOLESALE' | 'RETAIL' | 'RESTAURANT';
  email?: string;
  phone: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  joinedDate: string;
}

export interface OrderItem {
  inventoryItemId?: string; // Link to inventory if applicable
  flockId?: string; // Link to flock if selling live birds
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'DELIVERED' | 'CANCELLED';

export interface SalesOrder {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod?: 'CASH' | 'TRANSFER' | 'CHECK' | 'MOBILE_MONEY';
  notes?: string;
  subTotal?: number;
  vatAmount?: number;
  whtAmount?: number;
  vatRate?: number;
  whtRate?: number;
}

// Finance Types

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string; // e.g., Feed, Labor, Sales, Utilities
  amount: number;
  subTotal?: number;
  vatAmount?: number;
  whtAmount?: number;
  pensionAmount?: number;
  description: string;
  flockId?: string; // Optional link to a specific flock for cost accounting
  referenceId?: string; // Link to order or other entities
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
  period: string; // e.g. 'Monthly' or specific Batch ID
}

// HR & Payroll Types

export interface Employee {
  id: string;
  name: string;
  role: string; // Manager, Farm Hand, Vet, Admin
  phone: string;
  email?: string;
  baseSalary: number;
  allowances: number;
  deductions: number; // Recurring deductions
  taxRate?: number; // Percentage (e.g., 10 for 10%)
  pensionRate?: number; // Percentage (e.g., 8 for 8%)
  joinedDate: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface PayrollRun {
  id: string;
  date: string;
  period: string; // e.g., "October 2023"
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalPension: number;
  status: 'DRAFT' | 'PAID';
  employeeCount: number;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface HrTask {
  id: string;
  title: string;
  description?: string;
  assignedToId: string; // Employee ID
  assignedToName: string;
  relatedFlockId?: string; // Optional link to flock
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
}

// Notifications
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  timestamp: string; // e.g. "2 mins ago" or ISO
  isRead: boolean;
}

// Global Settings
export interface FarmProfile {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  currencySymbol: string;
  taxRateDefault: number;
  latitude?: number;
  longitude?: number;
  notifications?: {
    emailAlerts: boolean;
    lowStock: boolean;
    mortalityThreshold: boolean;
    weeklyReport: boolean;
  };
}