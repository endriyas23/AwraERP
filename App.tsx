import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { 
  Flock, 
  InventoryItem, 
  Transaction, 
  SalesOrder, 
  Customer, 
  Employee, 
  HrTask, 
  PayrollRun,
  FarmProfile, 
  ViewState, 
  AppNotification, 
  CurrentUser,
  FlockStatus 
} from './types';
import { 
  MOCK_FLOCKS, 
  MOCK_INVENTORY, 
  MOCK_TRANSACTIONS, 
  MOCK_ORDERS, 
  MOCK_CUSTOMERS, 
  MOCK_EMPLOYEES, 
  MOCK_TASKS, 
  DEFAULT_FARM_PROFILE,
  MOCK_NOTIFICATIONS
} from './constants';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import FlockList from './components/FlockList';
import FlockDetail from './components/FlockDetail';
import Inventory from './components/Inventory';
import HealthModule from './components/HealthModule';
import SalesCRM from './components/SalesCRM';
import FinanceModule from './components/FinanceModule';
import HRModule from './components/HRModule';
import SettingsModule from './components/SettingsModule';
import DatabaseSetup from './components/DatabaseSetup';
import { supabase } from './supabaseClient';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  // Authentication State
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // App View State
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedFlockId, setSelectedFlockId] = useState<string | null>(null);
  const [flockTab, setFlockTab] = useState<'OVERVIEW' | 'LOGS' | 'AI' | 'EGG_PROD'>('OVERVIEW');

  // Data State
  const [flocks, setFlocks] = useState<Flock[]>([]); // Initialize empty, fetch on load
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [orders, setOrders] = useState<SalesOrder[]>(MOCK_ORDERS);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [tasks, setTasks] = useState<HrTask[]>(MOCK_TASKS);
  const [payrollHistory, setPayrollHistory] = useState<PayrollRun[]>([]);
  const [farmProfile, setFarmProfile] = useState<FarmProfile>(DEFAULT_FARM_PROFILE);
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);
  
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    id: 'guest',
    name: 'Guest User',
    email: '',
    role: 'Viewer',
    avatar: ''
  });

  const [showDbSetup, setShowDbSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. Authentication Check ---
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        updateUserFromSession(session.user);
      }
      setIsAuthChecking(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        updateUserFromSession(session.user);
      } else {
        // Reset if logged out
        setCurrentUser({ id: 'guest', name: 'Guest', email: '', role: 'Viewer' });
      }
      setIsAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateUserFromSession = (user: any) => {
    setCurrentUser({
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Farm Manager',
      email: user.email || '',
      role: 'Admin', // Defaulting to Admin for now as it's single tenant usually
      avatar: user.user_metadata?.avatar_url || ''
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentView('DASHBOARD');
  };

  // --- 2. Data Fetching (Only if Authenticated) ---
  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      setIsLoading(true);
      
      // 1. Fetch Flocks
      const { data: flocksData, error: flocksError } = await supabase
        .from('flocks')
        .select('*')
        .order('created_at', { ascending: false });

      if (flocksError) {
        console.error("Error fetching flocks:", flocksError);
        // If table doesn't exist, prompt setup
        if (flocksError.code === '42P01' || flocksError.message.includes('does not exist')) {
            setShowDbSetup(true);
            setFlocks(MOCK_FLOCKS); // Fallback to mock if DB not ready
        }
      } else if (flocksData) {
        setFlocks(flocksData as Flock[]);
      } else {
        setFlocks(MOCK_FLOCKS);
      }

      // 2. Fetch Inventory
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .order('name', { ascending: true });
      
      if (invData) {
        setInventoryItems(invData as InventoryItem[]);
      } else if (invError && (invError.code === '42P01' || invError.message.includes('does not exist'))) {
         setInventoryItems(MOCK_INVENTORY);
      } else {
         setInventoryItems(MOCK_INVENTORY);
      }

      // 3. Fetch Transactions
      const { data: txData } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (txData) setTransactions(txData as Transaction[]);

      // 4. Fetch Sales Orders
      const { data: ordersData } = await supabase.from('sales_orders').select('*').order('date', { ascending: false });
      if (ordersData) setOrders(ordersData as SalesOrder[]);

      // 5. Fetch Customers
      const { data: customersData } = await supabase.from('customers').select('*').order('name', { ascending: true });
      if (customersData) setCustomers(customersData as Customer[]);

      // 6. Fetch Employees
      const { data: employeesData } = await supabase.from('employees').select('*').order('name', { ascending: true });
      if (employeesData) setEmployees(employeesData as Employee[]);

      // 7. Fetch Tasks
      const { data: tasksData } = await supabase.from('tasks').select('*').order('dueDate', { ascending: true });
      if (tasksData) setTasks(tasksData as HrTask[]);

      // 8. Fetch Payroll Runs
      const { data: payrollData } = await supabase.from('payroll_runs').select('*').order('date', { ascending: false });
      if (payrollData) setPayrollHistory(payrollData as PayrollRun[]);

      // 9. Fetch Settings
      const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 'global').single();
      if (settingsData) {
        setFarmProfile({
          name: settingsData.farmName || '',
          address: settingsData.address || '',
          city: settingsData.city || '',
          phone: settingsData.phone || '',
          email: settingsData.email || '',
          currencySymbol: settingsData.currencySymbol || '$',
          taxRateDefault: settingsData.taxRateDefault || 0,
          latitude: settingsData.latitude,
          longitude: settingsData.longitude,
          notifications: settingsData.notifications || {
             emailAlerts: true, lowStock: true, mortalityThreshold: true, weeklyReport: false
          }
        });
      }

      setIsLoading(false);
    };

    fetchData();
  }, [session]); // Run when session becomes available

  // Handlers
  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
    if (view !== 'FLOCK_DETAIL') {
      setSelectedFlockId(null);
    }
  };

  const handleSelectFlock = (id: string, tab: any = 'OVERVIEW') => {
    setSelectedFlockId(id);
    setFlockTab(tab);
    setCurrentView('FLOCK_DETAIL');
  };

  // -- CRUD Handlers (Supabase Integration) --

  // Flock
  const handleAddFlock = async (flock: Flock) => {
    // Optimistic Update
    setFlocks(prev => [flock, ...prev]);
    
    const { error } = await supabase.from('flocks').insert([flock]);
    if (error) {
      console.error('Supabase error adding flock:', error);
      alert('Failed to save flock to database. Please check connection.');
      // Revert if needed, or rely on next fetch
    }
  };

  const handleUpdateFlock = async (updatedFlock: Flock) => {
    setFlocks(prev => prev.map(f => f.id === updatedFlock.id ? updatedFlock : f));
    
    // We remove the UI-only fields if they exist implicitly, but Flock type matches DB
    const { error } = await supabase
      .from('flocks')
      .update(updatedFlock)
      .eq('id', updatedFlock.id);

    if (error) {
      console.error('Supabase error updating flock:', error);
    }
  };

  const handleDeleteFlock = async (id: string) => {
    setFlocks(prev => prev.filter(f => f.id !== id));
    if (selectedFlockId === id) {
      setCurrentView('FLOCK_LIST');
      setSelectedFlockId(null);
    }

    const { error } = await supabase.from('flocks').delete().eq('id', id);
    if (error) {
      console.error('Supabase error deleting flock:', error);
    }
  };

  // Inventory
  const prepareInventoryItemForDb = (item: InventoryItem) => {
    return {
      ...item,
      // Ensure arrays are valid arrays for JSONB
      maintenanceLogs: item.maintenanceLogs || [],
      usageLogs: item.usageLogs || [],
      targetBirdType: item.targetBirdType || null,
      notes: item.notes || null,
      location: item.location || null,
      serialNumber: item.serialNumber || null,
      model: item.model || null,
      warrantyExpiry: item.warrantyExpiry || null,
      nextMaintenanceDate: item.nextMaintenanceDate || null,
      purchaseDate: item.purchaseDate || null
    };
  };

  const handleAddItem = async (item: InventoryItem) => {
    setInventoryItems(prev => [item, ...prev]);
    const dbItem = prepareInventoryItemForDb(item);
    const { error } = await supabase.from('inventory').insert([dbItem]);
    if (error) {
      console.error('Error adding inventory:', JSON.stringify(error, null, 2));
      if (error.code === '42P01') {
         alert("Database schema outdated. New fields (e.g., maintenanceLogs) or table missing. Opening setup wizard...");
         setShowDbSetup(true);
      }
    }
  };

  const handleUpdateItem = async (item: InventoryItem) => {
    setInventoryItems(prev => prev.map(i => i.id === item.id ? item : i));
    const dbItem = prepareInventoryItemForDb(item);
    const { error } = await supabase.from('inventory').update(dbItem).eq('id', item.id);
    if (error) {
        console.error('Error updating inventory:', JSON.stringify(error, null, 2));
        if (error.code === '42P01') setShowDbSetup(true);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setInventoryItems(prev => prev.filter(i => i.id !== id));
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) console.error('Error deleting inventory:', error);
  };

  // Transactions
  const handleAddTransaction = async (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
    const { error } = await supabase.from('transactions').insert([tx]);
    if (error && error.code !== '42P01') console.error('Error saving transaction:', error);
  };

  const handleUpdateTransaction = async (tx: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
    const { error } = await supabase.from('transactions').update(tx).eq('id', tx.id);
    if (error) console.error('Error updating transaction:', error);
  };

  const handleDeleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) console.error('Error deleting transaction:', error);
  };

  // Orders
  const handleAddOrder = async (order: SalesOrder) => {
    setOrders(prev => [order, ...prev]);
    
    const { error } = await supabase.from('sales_orders').insert([order]);
    if (error) {
        console.error('Error saving order:', error);
        if (error.code === '42P01') {
            setShowDbSetup(true);
        }
    } else {
        const transaction: Transaction = {
            id: `tx-${order.id}`, 
            date: order.date,
            type: 'INCOME',
            category: 'Sales - General',
            amount: order.totalAmount,
            subTotal: order.subTotal,
            vatAmount: order.vatAmount,
            whtAmount: order.whtAmount,
            description: `Sales Order #${order.id.split('-')[1] || order.id} - ${order.customerName}`,
            referenceId: order.id,
            flockId: order.items[0]?.flockId 
        };
        await handleAddTransaction(transaction);
    }
  };

  const handleUpdateOrder = async (order: SalesOrder) => {
    setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    
    const { error } = await supabase.from('sales_orders').update(order).eq('id', order.id);
    if (error) console.error('Error updating order:', error);

    const txId = `tx-${order.id}`;
    const existingTx = transactions.find(t => t.id === txId || t.referenceId === order.id);
    
    const txUpdate: Transaction = {
        id: existingTx ? existingTx.id : txId,
        date: order.date,
        type: 'INCOME',
        category: existingTx ? existingTx.category : 'Sales - General',
        amount: order.totalAmount,
        subTotal: order.subTotal,
        vatAmount: order.vatAmount,
        whtAmount: order.whtAmount,
        description: `Sales Order #${order.id.split('-')[1] || order.id} - ${order.customerName}`,
        referenceId: order.id,
        flockId: order.items[0]?.flockId || existingTx?.flockId
    };

    if (existingTx) {
        await handleUpdateTransaction(txUpdate);
    } else {
        await handleAddTransaction(txUpdate);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    
    const { error } = await supabase.from('sales_orders').delete().eq('id', id);
    if (error) console.error('Error deleting order:', error);

    const relatedTx = transactions.find(t => t.referenceId === id || t.id === `tx-${id}`);
    if (relatedTx) {
        await handleDeleteTransaction(relatedTx.id);
    }
  };

  // Customers
  const handleAddCustomer = async (customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
    const { error } = await supabase.from('customers').insert([customer]);
    if (error) console.error('Error adding customer:', error);
  };

  const handleUpdateCustomer = async (customer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
    const { error } = await supabase.from('customers').update(customer).eq('id', customer.id);
    if (error) console.error('Error updating customer:', error);
  };

  const handleDeleteCustomer = async (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) console.error('Error deleting customer:', error);
  };

  // Employees
  const handleAddEmployee = async (emp: Employee) => {
    setEmployees(prev => [emp, ...prev]);
    const { error } = await supabase.from('employees').insert([emp]);
    if (error) console.error('Error adding employee:', error);
  };

  const handleUpdateEmployee = async (emp: Employee) => {
    setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
    const { error } = await supabase.from('employees').update(emp).eq('id', emp.id);
    if (error) console.error('Error updating employee:', error);
  };

  const handleDeleteEmployee = async (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) console.error('Error deleting employee:', error);
  };

  // Tasks
  const handleAddTask = async (task: HrTask) => {
    setTasks(prev => [task, ...prev]);
    const { error } = await supabase.from('tasks').insert([task]);
    if (error) console.error('Error adding task:', error);
  };

  const handleUpdateTask = async (task: HrTask) => {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    const { error } = await supabase.from('tasks').update(task).eq('id', task.id);
    if (error) console.error('Error updating task:', error);
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error('Error deleting task:', error);
  };

  // Payroll Runs
  const handleAddPayrollRun = async (run: PayrollRun) => {
    setPayrollHistory(prev => [run, ...prev]);
    const { error } = await supabase.from('payroll_runs').insert([run]);
    if (error) {
        console.error('Error adding payroll run:', error);
        if (error.code === '42P01') setShowDbSetup(true);
    }
  };

  // Settings
  const handleUpdateProfile = async (profile: FarmProfile) => {
    setFarmProfile(profile);
    
    const settingsPayload = {
        id: 'global',
        farmName: profile.name,
        address: profile.address,
        city: profile.city,
        phone: profile.phone,
        email: profile.email,
        currencySymbol: profile.currencySymbol,
        taxRateDefault: profile.taxRateDefault,
        latitude: profile.latitude,
        longitude: profile.longitude,
        notifications: profile.notifications || {}
    };

    const { error } = await supabase.from('settings').upsert(settingsPayload);
    
    if (error) {
        console.error("Error saving settings:", JSON.stringify(error, null, 2));
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
            setShowDbSetup(true);
        }
    }
  };

  // Notifications
  const handleMarkAsRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  const handleClearNotifications = () => setNotifications([]);

  // Render Content Switch
  const renderContent = () => {
    if (isLoading && session) {
      return (
        <div className="flex h-full items-center justify-center text-slate-400">
          <Loader2 className="animate-spin mr-2 h-8 w-8 text-primary-600" />
          Loading Farm Data...
        </div>
      );
    }

    switch (currentView) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            flocks={flocks} 
            inventoryItems={inventoryItems} 
            tasks={tasks} 
            transactions={transactions}
            onNavigate={handleNavigate}
            farmProfile={farmProfile}
          />
        );
      case 'FLOCK_LIST':
        return (
          <FlockList 
            flocks={flocks} 
            onSelectFlock={handleSelectFlock} 
            onAddFlock={handleAddFlock} 
            onDeleteFlock={handleDeleteFlock}
            onAddTransaction={handleAddTransaction} 
          />
        );
      case 'FLOCK_DETAIL':
        const selectedFlock = flocks.find(f => f.id === selectedFlockId);
        if (!selectedFlock) return <div>Flock not found</div>;
        return (
          <FlockDetail 
            flock={selectedFlock} 
            inventoryItems={inventoryItems}
            customers={customers}
            onAddOrder={handleAddOrder}
            onBack={() => handleNavigate('FLOCK_LIST')}
            onUpdateFlock={handleUpdateFlock}
            onDeleteFlock={handleDeleteFlock}
            onUpdateInventory={handleUpdateItem}
            onAddInventoryItem={handleAddItem}
            onViewHealth={() => handleNavigate('HEALTH')}
            initialTab={flockTab as any}
          />
        );
      case 'FEED':
        return (
          <Inventory 
            items={inventoryItems}
            flocks={flocks} 
            onUpdateItem={handleUpdateItem}
            onAddItem={handleAddItem}
            onDeleteItem={handleDeleteItem}
            onAddTransaction={handleAddTransaction} 
            onUpdateFlock={handleUpdateFlock} 
          />
        );
      case 'HEALTH':
        return (
          <HealthModule 
            flocks={flocks}
            onUpdateFlock={handleUpdateFlock}
            initialFlockId={selectedFlockId}
            inventoryItems={inventoryItems}
            onUpdateInventory={handleUpdateItem}
          />
        );
      case 'SALES':
        return (
          <SalesCRM 
            orders={orders}
            customers={customers}
            inventoryItems={inventoryItems}
            flocks={flocks}
            farmProfile={farmProfile}
            onAddOrder={handleAddOrder}
            onUpdateOrder={handleUpdateOrder}
            onDeleteOrder={handleDeleteOrder}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onUpdateInventory={handleUpdateItem}
            onUpdateFlock={handleUpdateFlock}
          />
        );
      case 'FINANCE':
        return (
          <FinanceModule 
             transactions={transactions}
             flocks={flocks}
             orders={orders}
             inventoryItems={inventoryItems}
             farmProfile={farmProfile}
             onAddTransaction={handleAddTransaction}
             onUpdateTransaction={handleUpdateTransaction}
             onDeleteTransaction={handleDeleteTransaction}
             onUpdateOrder={handleUpdateOrder}
             onNavigate={handleNavigate}
          />
        );
      case 'HR':
        return (
          <HRModule 
            employees={employees}
            tasks={tasks}
            flocks={flocks}
            payrollHistory={payrollHistory}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onAddTransaction={handleAddTransaction}
            onAddPayrollRun={handleAddPayrollRun}
          />
        );
      case 'SETTINGS':
        return (
          <SettingsModule 
            farmProfile={farmProfile}
            onUpdateProfile={handleUpdateProfile}
            onResetData={() => {
               if(confirm("Reset all data to defaults? This will clear local state.")) {
                  setFlocks(MOCK_FLOCKS);
                  setInventoryItems(MOCK_INVENTORY);
                  setTransactions(MOCK_TRANSACTIONS);
                  setOrders(MOCK_ORDERS);
                  setCustomers(MOCK_CUSTOMERS);
                  setEmployees(MOCK_EMPLOYEES);
                  setTasks(MOCK_TASKS);
                  setPayrollHistory([]);
               }
            }}
            onExportData={() => {
              const data = {
                farmProfile,
                flocks,
                inventoryItems,
                transactions,
                orders,
                customers,
                employees,
                tasks,
                payrollHistory
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `awra_erp_backup_${new Date().toISOString().split('T')[0]}.json`;
              a.click();
            }}
          />
        );
      default:
        return <div>Page not found</div>;
    }
  };

  // Auth Loading Screen
  if (isAuthChecking) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  // Not Authenticated -> Show Auth Screen
  if (!session) {
    return <Auth />;
  }

  // Authenticated App
  return (
    <>
      <Layout 
        currentView={currentView} 
        onNavigate={handleNavigate}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onClearAllNotifications={handleClearNotifications}
        currentUser={currentUser}
        onUpdateUser={setCurrentUser}
        onLogout={handleLogout}
      >
        {renderContent()}
      </Layout>
      
      <DatabaseSetup 
         isOpen={showDbSetup} 
         onDismiss={() => setShowDbSetup(false)} 
      />
    </>
  );
};

export default App;