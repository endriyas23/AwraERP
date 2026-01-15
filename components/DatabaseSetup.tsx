import React, { useState } from 'react';
import { Copy, Check, Database, ExternalLink, X, Wheat } from 'lucide-react';

interface DatabaseSetupProps {
  onDismiss: () => void;
  isOpen: boolean;
}

const DatabaseSetup: React.FC<DatabaseSetupProps> = ({ onDismiss, isOpen }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'FULL' | 'INVENTORY'>('FULL');

  if (!isOpen) return null;

  const inventorySql = `/* INVENTORY MODULE SETUP */

/* 1. Inventory Table Structure */
create table if not exists public.inventory (
  "id" text primary key,
  "name" text not null,
  "category" text not null,
  "quantity" numeric default 0,
  "unit" text not null,
  "minLevel" numeric default 0,
  "costPerUnit" numeric default 0,
  "vatRate" numeric default 0,
  "whtRate" numeric default 0,
  "lastUpdated" text,
  "location" text,
  "notes" text,
  "targetBirdType" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

/* 2. Schema Patch (Fix missing columns) */
alter table public.inventory add column if not exists "vatRate" numeric default 0;
alter table public.inventory add column if not exists "whtRate" numeric default 0;
alter table public.inventory add column if not exists "targetBirdType" text;

/* Equipment Management Fields */
alter table public.inventory add column if not exists "serialNumber" text;
alter table public.inventory add column if not exists "model" text;
alter table public.inventory add column if not exists "purchaseDate" text;
alter table public.inventory add column if not exists "warrantyExpiry" text;
alter table public.inventory add column if not exists "maintenanceLogs" jsonb default '[]'::jsonb;
alter table public.inventory add column if not exists "usageLogs" jsonb default '[]'::jsonb;
alter table public.inventory add column if not exists "nextMaintenanceDate" text;

/* 3. Row Level Security */
alter table inventory enable row level security;

drop policy if exists "Public Access Inventory" on inventory;
create policy "Public Access Inventory" on inventory for all using (true) with check (true);

/* 4. Refresh Supabase Schema Cache */
NOTIFY pgrst, 'reload config';`;

  const fullSqlCode = `/* Run this in your Supabase SQL Editor to create tables, triggers and fix RLS permissions */

/* --- CORE DATA TABLES --- */

/* 1. Flocks Table */
create table if not exists public.flocks (
  "id" text primary key,
  "name" text not null,
  "batchId" text,
  "type" text not null,
  "productionStage" text,
  "breed" text,
  "house" text,
  "source" text,
  "startDate" text not null,
  "initialAgeDays" numeric default 0,
  "initialCount" numeric default 0,
  "initialCost" numeric default 0,
  "vatRate" numeric default 0,
  "whtRate" numeric default 0,
  "currentCount" numeric default 0,
  "totalSold" numeric default 0,
  "status" text not null,
  "logs" jsonb default '[]'::jsonb,
  "healthChecklist" jsonb default '[]'::jsonb,
  "healthRecords" jsonb default '[]'::jsonb,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

/* 2. Inventory Table */
create table if not exists public.inventory (
  "id" text primary key,
  "name" text not null,
  "category" text not null,
  "quantity" numeric default 0,
  "unit" text not null,
  "minLevel" numeric default 0,
  "costPerUnit" numeric default 0,
  "vatRate" numeric default 0,
  "whtRate" numeric default 0,
  "lastUpdated" text,
  "location" text,
  "notes" text,
  "targetBirdType" text,
  "serialNumber" text,
  "model" text,
  "purchaseDate" text,
  "warrantyExpiry" text,
  "maintenanceLogs" jsonb default '[]'::jsonb,
  "usageLogs" jsonb default '[]'::jsonb,
  "nextMaintenanceDate" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

/* 3. Customers Table */
create table if not exists public.customers (
  "id" text primary key,
  "name" text not null,
  "type" text,
  "email" text,
  "phone" text,
  "address" text,
  "totalOrders" numeric default 0,
  "totalSpent" numeric default 0,
  "joinedDate" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

/* 4. Sales Orders Table */
create table if not exists public.sales_orders (
  "id" text primary key,
  "customerId" text,
  "customerName" text,
  "date" text not null,
  "items" jsonb default '[]'::jsonb,
  "totalAmount" numeric default 0,
  "status" text not null,
  "paymentMethod" text,
  "notes" text,
  "subTotal" numeric default 0,
  "vatAmount" numeric default 0,
  "whtAmount" numeric default 0,
  "vatRate" numeric default 0,
  "whtRate" numeric default 0,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

/* 5. Transactions Table */
create table if not exists public.transactions (
  "id" text primary key,
  "date" text not null,
  "type" text not null,
  "category" text not null,
  "amount" numeric default 0,
  "subTotal" numeric default 0,
  "vatAmount" numeric default 0,
  "whtAmount" numeric default 0,
  "pensionAmount" numeric default 0,
  "description" text,
  "flockId" text,
  "referenceId" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

/* 6. Employees Table */
create table if not exists public.employees (
  "id" text primary key,
  "name" text not null,
  "role" text not null,
  "phone" text,
  "email" text,
  "baseSalary" numeric default 0,
  "allowances" numeric default 0,
  "deductions" numeric default 0,
  "taxRate" numeric default 0,
  "pensionRate" numeric default 0,
  "joinedDate" text,
  "status" text not null,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

/* 7. Tasks Table */
create table if not exists public.tasks (
  "id" text primary key,
  "title" text not null,
  "description" text,
  "assignedToId" text,
  "assignedToName" text,
  "relatedFlockId" text,
  "priority" text,
  "dueDate" text,
  "status" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

/* 8. Payroll Runs Table */
create table if not exists public.payroll_runs (
  "id" text primary key,
  "date" text not null,
  "period" text,
  "totalGross" numeric default 0,
  "totalNet" numeric default 0,
  "totalTax" numeric default 0,
  "totalPension" numeric default 0,
  "employeeCount" numeric default 0,
  "status" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

/* 9. Settings Table */
create table if not exists public.settings (
  "id" text primary key,
  "farmName" text,
  "address" text,
  "city" text,
  "phone" text,
  "email" text,
  "currencySymbol" text default '$',
  "taxRateDefault" numeric default 0,
  "latitude" numeric,
  "longitude" numeric,
  "notifications" jsonb default '{}'::jsonb,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

/* --- USER AUTHENTICATION & PROFILES --- */

/* 10. Profiles Table (Syncs with auth.users) */
create table if not exists public.profiles (
  "id" uuid references auth.users on delete cascade not null primary key,
  "email" text,
  "full_name" text,
  "role" text default 'Viewer',
  "avatar_url" text,
  "updated_at" timestamp with time zone,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

/* 11. Auth Hooks (Triggers) */
/* Function to handle new user signup */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'Admin', -- Default role for first user
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

/* Trigger to execute the function on every new auth.users insert */
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

/* --- ROW LEVEL SECURITY (RLS) --- */

/* Enable RLS on all tables */
alter table flocks enable row level security;
alter table inventory enable row level security;
alter table customers enable row level security;
alter table sales_orders enable row level security;
alter table transactions enable row level security;
alter table employees enable row level security;
alter table tasks enable row level security;
alter table payroll_runs enable row level security;
alter table settings enable row level security;
alter table profiles enable row level security;

/* Create Policies (Allowing full access for authenticated users for this ERP scope) */
/* In a multi-tenant system, you would filter by 'org_id' here. */

drop policy if exists "Public Access Flocks" on flocks;
create policy "Public Access Flocks" on flocks for all using (true) with check (true);

drop policy if exists "Public Access Inventory" on inventory;
create policy "Public Access Inventory" on inventory for all using (true) with check (true);

drop policy if exists "Public Access Customers" on customers;
create policy "Public Access Customers" on customers for all using (true) with check (true);

drop policy if exists "Public Access Orders" on sales_orders;
create policy "Public Access Orders" on sales_orders for all using (true) with check (true);

drop policy if exists "Public Access Transactions" on transactions;
create policy "Public Access Transactions" on transactions for all using (true) with check (true);

drop policy if exists "Public Access Employees" on employees;
create policy "Public Access Employees" on employees for all using (true) with check (true);

drop policy if exists "Public Access Tasks" on tasks;
create policy "Public Access Tasks" on tasks for all using (true) with check (true);

drop policy if exists "Public Access Payroll" on payroll_runs;
create policy "Public Access Payroll" on payroll_runs for all using (true) with check (true);

/* RLS POLICY FIX: Settings Table */
drop policy if exists "Public Access Settings" on settings;
create policy "Public Access Settings" on settings for all using (true) with check (true);

/* Profiles Policies */
drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone" on profiles for select using (true);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

/* --- CLEANUP & REFRESH --- */
NOTIFY pgrst, 'reload config';
`;

  const displayedSql = activeTab === 'FULL' ? fullSqlCode : inventorySql;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Database className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Database & Schema Setup</h2>
              <p className="text-sm text-slate-500">
                Fix missing tables or RLS permission errors (Code 42501).
              </p>
            </div>
          </div>
          <button 
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-6 pt-4 flex gap-2 border-b border-slate-100">
            <button 
                onClick={() => setActiveTab('FULL')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'FULL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Full Database
            </button>
            <button 
                onClick={() => setActiveTab('INVENTORY')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'INVENTORY' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Wheat size={14} /> Inventory Module Only
            </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <div className="text-blue-600 mt-0.5"><ExternalLink size={20} /></div>
            <div className="text-sm text-blue-900">
              <p className="font-bold mb-1">Instructions:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Copy the SQL code below.</li>
                <li>Go to your <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-blue-700">Supabase Dashboard SQL Editor</a>.</li>
                <li>Create a <strong>New Query</strong>, paste the code, and click <strong>Run</strong>.</li>
                <li>Come back here and click <strong>Refresh Page</strong>.</li>
              </ol>
            </div>
          </div>

          <div className="relative">
            <div className="absolute top-2 right-2">
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm ${copied ? 'bg-green-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
              >
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy SQL</>}
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl text-xs font-mono overflow-x-auto h-80 border border-slate-700">
              {displayedSql}
            </pre>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">
          <button 
            onClick={onDismiss}
            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Dismiss
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            I've run the SQL, Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSetup;