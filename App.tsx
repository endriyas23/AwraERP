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
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedFlockId, setSelectedFlockId] = useState<string | null>(null);
  const [flockTab, setFlockTab] = useState<'OVERVIEW' | 'LOGS' | 'AI' | 'EGG_PROD'>('OVERVIEW');

  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<HrTask[]>([]);
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) updateUserFromSession(session.user);
      setIsAuthChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        updateUserFromSession(session.user);
      } else {
        setCurrentUser({ id: 'guest', name: 'Guest', email: '', role: 'Viewer' });
      }
      setIsAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateUserFromSession = async (user: any) => {
    try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentUser({
          id: user.id,
          name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Farm Manager',
          email: user.email || '',
          role: profile?.role || 'Admin',
          avatar: profile?.avatar_url || user.user_metadata?.avatar_url || '',
          phone: user.phone || ''
        });
    } catch (e) {
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Farm Manager',
          email: user.email || '',
          role: 'Admin',
          avatar: user.user_metadata?.avatar_url || ''
        });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentView('DASHBOARD');
  };

  const handleUpdateUser = async (updatedUser: CurrentUser, newPassword?: string) => {
    if (updatedUser.id === 'guest') return;
    setCurrentUser(updatedUser);
    try {
      const updates = { id: updatedUser.id, full_name: updatedUser.name, avatar_url: updatedUser.avatar, updated_at: new Date().toISOString() };
      await supabase.from('profiles').upsert(updates);
      const authUpdates: any = { data: { full_name: updatedUser.name, avatar_url: updatedUser.avatar } };
      if (newPassword?.trim()) authUpdates.password = newPassword;
      if (updatedUser.email && updatedUser.email !== session?.user.email) authUpdates.email = updatedUser.email;
      const { error: authError } = await supabase.auth.updateUser(authUpdates);
      if (authError) throw authError;
    } catch (error: any) {
       console.error('Error updating profile:', error);
    }
  };

  useEffect(() => {
    if (!session) return;
    const fetchData = async () => {
      setIsLoading(true);
      const results = await Promise.all([
        supabase.from('flocks').select('*').order('created_at', { ascending: false }),
        supabase.from('inventory').select('*').order('name', { ascending: true }),
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('sales_orders').select('*').order('date', { ascending: false }),
        supabase.from('customers').select('*').order('name', { ascending: true }),
        supabase.from('employees').select('*').order('name', { ascending: true }),
        supabase.from('tasks').select('*').order('dueDate', { ascending: true }),
        supabase.from('payroll_runs').select('*').order('date', { ascending: false }),
        supabase.from('settings').select('*').eq('id', 'global').single()
      ]);

      const [f, inv, tx, ord, cust, emp, tsk, pay, set] = results;

      // Detect table missing or permission denied errors for core modules
      const criticalError = results.find(r => r.error?.code === '42P01' || r.error?.code === '42501');
      if (criticalError) {
          console.warn('Database access issue detected:', criticalError.error);
          setShowDbSetup(true);
      }

      if (f.data) setFlocks(f.data);
      if (inv.data) setInventoryItems(inv.data);
      if (tx.data) setTransactions(tx.data);
      if (ord.data) setOrders(ord.data);
      if (cust.data) setCustomers(cust.data);
      if (emp.data) setEmployees(emp.data);
      if (tsk.data) setTasks(tsk.data);
      if (pay.data) setPayrollHistory(pay.data);
      if (set.data) setFarmProfile({
          name: set.data.farmName || '',
          address: set.data.address || '',
          city: set.data.city || '',
          phone: set.data.phone || '',
          email: set.data.email || '',
          currencySymbol: set.data.currencySymbol || '$',
          taxRateDefault: set.data.taxRateDefault || 0,
          latitude: set.data.latitude,
          longitude: set.data.longitude,
          notifications: set.data.notifications || { emailAlerts: true, lowStock: true, mortalityThreshold: true, weeklyReport: false }
      });
      setIsLoading(false);
    };
    fetchData();
  }, [session]);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
    if (view !== 'FLOCK_DETAIL') setSelectedFlockId(null);
  };

  const handleSelectFlock = (id: string, tab: any = 'OVERVIEW') => {
    setSelectedFlockId(id);
    setFlockTab(tab);
    setCurrentView('FLOCK_DETAIL');
  };

  const handleAddFlock = async (flock: Flock) => {
    setFlocks(prev => [flock, ...prev]);
    const { error } = await supabase.from('flocks').insert([flock]);
    if (error) {
        console.error('Error adding flock:', error);
        if (error.code === '42P01' || error.code === '42501') setShowDbSetup(true);
    }
  };

  const handleUpdateFlock = async (updatedFlock: Flock) => {
    setFlocks(prev => prev.map(f => f.id === updatedFlock.id ? updatedFlock : f));
    const { error } = await supabase.from('flocks').update(updatedFlock).eq('id', updatedFlock.id);
    if (error) {
        console.error('Error updating flock:', error);
        if (error.code === '42501') setShowDbSetup(true);
    }
  };

  const handleDeleteFlock = async (id: string) => {
    setFlocks(prev => prev.filter(f => f.id !== id));
    await supabase.from('flocks').delete().eq('id', id);
  };

  const handleAddItem = async (item: InventoryItem) => {
    setInventoryItems(prev => [item, ...prev]);
    const { error } = await supabase.from('inventory').insert([item]);
    if (error?.code === '42P01') setShowDbSetup(true);
  };

  const handleUpdateItem = async (item: InventoryItem) => {
    setInventoryItems(prev => prev.map(i => i.id === item.id ? item : i));
    await supabase.from('inventory').update(item).eq('id', item.id);
  };

  const handleDeleteItem = async (id: string) => {
    setInventoryItems(prev => prev.filter(i => i.id !== id));
    await supabase.from('inventory').delete().eq('id', id);
  };

  const handleAddTransaction = async (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
    const { error } = await supabase.from('transactions').insert([tx]);
    if (error?.code === '42P01') setShowDbSetup(true);
  };

  const handleUpdateTransaction = async (tx: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
    await supabase.from('transactions').update(tx).eq('id', tx.id);
  };

  const handleDeleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    await supabase.from('transactions').delete().eq('id', id);
  };

  const handleAddOrder = async (order: SalesOrder) => {
    setOrders(prev => [order, ...prev]);
    const { error } = await supabase.from('sales_orders').insert([order]);
    if (error) {
        console.error('Error adding order:', error);
        if (error.code === '42P01' || error.code === '42501') setShowDbSetup(true);
    }
    
    // Auto-update Customer Stats
    const customer = customers.find(c => c.id === order.customerId);
    if (customer) {
        const updatedCustomer = {
            ...customer,
            totalOrders: (Number(customer.totalOrders) || 0) + 1,
            totalSpent: (Number(customer.totalSpent) || 0) + order.totalAmount
        };
        await handleUpdateCustomer(updatedCustomer);
    }

    const transaction: Transaction = {
        id: `tx-${order.id}`, date: order.date, type: 'INCOME', category: 'Sales - General',
        amount: order.totalAmount, subTotal: order.subTotal, vatAmount: order.vatAmount, whtAmount: order.whtAmount,
        description: `Sales Order #${order.id.split('-')[1] || order.id} - ${order.customerName}`,
        referenceId: order.id, flockId: order.items[0]?.flockId 
    };
    await handleAddTransaction(transaction);
  };

  const handleUpdateOrder = async (order: SalesOrder) => {
    const oldOrder = orders.find(o => o.id === order.id);
    setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    await supabase.from('sales_orders').update(order).eq('id', order.id);

    // Re-sync Customer Stats if amount changed
    if (oldOrder && oldOrder.totalAmount !== order.totalAmount) {
        const customer = customers.find(c => c.id === order.customerId);
        if (customer) {
            const updatedCustomer = {
                ...customer,
                totalSpent: (Number(customer.totalSpent) || 0) - oldOrder.totalAmount + order.totalAmount
            };
            await handleUpdateCustomer(updatedCustomer);
        }
    }
  };

  const handleDeleteOrder = async (id: string) => {
    const order = orders.find(o => o.id === id);
    setOrders(prev => prev.filter(o => o.id !== id));
    await supabase.from('sales_orders').delete().eq('id', id);
    
    if (order) {
        const customer = customers.find(c => c.id === order.customerId);
        if (customer) {
            const updatedCustomer = {
                ...customer,
                totalOrders: Math.max(0, (Number(customer.totalOrders) || 0) - 1),
                totalSpent: Math.max(0, (Number(customer.totalSpent) || 0) - order.totalAmount)
            };
            await handleUpdateCustomer(updatedCustomer);
        }
    }
  };

  const handleAddCustomer = async (customer: Customer) => {
    // Explicitly destructure to ensure we only send DB columns
    const { id, name, type, email, phone, address, totalOrders, totalSpent, joinedDate } = customer;
    const payload = { id, name, type, email, phone, address, totalOrders, totalSpent, joinedDate };

    setCustomers(prev => [customer, ...prev]);
    const { error } = await supabase.from('customers').insert([payload]);
    
    if (error) {
        console.error('Error saving customer:', error);
        // Revert local state if DB save failed
        setCustomers(prev => prev.filter(c => c.id !== id));
        if (error.code === '42P01' || error.code === '42501') setShowDbSetup(true);
    }
  };

  const handleUpdateCustomer = async (customer: Customer) => {
    // Only send the core fields to prevent errors with protected columns like created_at
    const { id, name, type, email, phone, address, totalOrders, totalSpent, joinedDate } = customer;
    const updatePayload = { name, type, email, phone, address, totalOrders, totalSpent, joinedDate };
    
    setCustomers(prev => prev.map(c => c.id === id ? customer : c));
    const { error } = await supabase.from('customers').update(updatePayload).eq('id', id);
    
    if (error) {
        console.error('Error updating customer:', error);
        if (error.code === '42P01' || error.code === '42501') setShowDbSetup(true);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    await supabase.from('customers').delete().eq('id', id);
  };

  const handleAddEmployee = async (emp: Employee) => {
    setEmployees(prev => [emp, ...prev]);
    await supabase.from('employees').insert([emp]);
  };

  const handleUpdateEmployee = async (emp: Employee) => {
    setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
    await supabase.from('employees').update(emp).eq('id', emp.id);
  };

  const handleDeleteEmployee = async (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    await supabase.from('employees').delete().eq('id', id);
  };

  const handleAddTask = async (task: HrTask) => {
    setTasks(prev => [task, ...prev]);
    await supabase.from('tasks').insert([task]);
  };

  const handleUpdateTask = async (task: HrTask) => {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    await supabase.from('tasks').update(task).eq('id', task.id);
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  };

  const handleAddPayrollRun = async (run: PayrollRun) => {
    setPayrollHistory(prev => [run, ...prev]);
    await supabase.from('payroll_runs').insert([run]);
  };

  const handleUpdateProfile = async (profile: FarmProfile) => {
    setFarmProfile(profile);
    const payload = { id: 'global', farmName: profile.name, address: profile.address, city: profile.city, phone: profile.phone, email: profile.email, currencySymbol: profile.currencySymbol, taxRateDefault: profile.taxRateDefault, latitude: profile.latitude, longitude: profile.longitude, notifications: profile.notifications || {} };
    const { error } = await supabase.from('settings').upsert(payload);
    if (error?.code === '42P01') setShowDbSetup(true);
  };

  const handleMarkAsRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  const handleClearNotifications = () => setNotifications([]);

  const renderContent = () => {
    if (isLoading && session) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2 h-8 w-8 text-primary-600" />Loading Farm Data...</div>;
    switch (currentView) {
      case 'DASHBOARD': return <Dashboard flocks={flocks} inventoryItems={inventoryItems} tasks={tasks} transactions={transactions} onNavigate={handleNavigate} farmProfile={farmProfile} />;
      case 'FLOCK_LIST': return <FlockList flocks={flocks} onSelectFlock={handleSelectFlock} onAddFlock={handleAddFlock} onDeleteFlock={handleDeleteFlock} onAddTransaction={handleAddTransaction} />;
      case 'FLOCK_DETAIL':
        const selectedFlock = flocks.find(f => f.id === selectedFlockId);
        if (!selectedFlock) return <div>Flock not found</div>;
        return <FlockDetail flock={selectedFlock} inventoryItems={inventoryItems} customers={customers} transactions={transactions} onAddOrder={handleAddOrder} onBack={() => handleNavigate('FLOCK_LIST')} onUpdateFlock={handleUpdateFlock} onDeleteFlock={handleDeleteFlock} onUpdateInventory={handleUpdateItem} onAddInventoryItem={handleAddItem} onViewHealth={() => handleNavigate('HEALTH')} initialTab={flockTab as any} />;
      case 'FEED': return <Inventory items={inventoryItems} flocks={flocks} onUpdateItem={handleUpdateItem} onAddItem={handleAddItem} onDeleteItem={handleDeleteItem} onAddTransaction={handleAddTransaction} onUpdateFlock={handleUpdateFlock} />;
      case 'HEALTH': return <HealthModule flocks={flocks} onUpdateFlock={handleUpdateFlock} initialFlockId={selectedFlockId} inventoryItems={inventoryItems} onUpdateInventory={handleUpdateItem} />;
      case 'SALES': return <SalesCRM orders={orders} customers={customers} inventoryItems={inventoryItems} flocks={flocks} farmProfile={farmProfile} onAddOrder={handleAddOrder} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} onAddCustomer={handleAddCustomer} onUpdateCustomer={handleUpdateCustomer} onDeleteCustomer={handleDeleteCustomer} onUpdateInventory={handleUpdateItem} onUpdateFlock={handleUpdateFlock} />;
      case 'FINANCE': return <FinanceModule transactions={transactions} flocks={flocks} orders={orders} inventoryItems={inventoryItems} farmProfile={farmProfile} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} onUpdateOrder={handleUpdateOrder} onNavigate={handleNavigate} />;
      case 'HR': return <HRModule employees={employees} tasks={tasks} flocks={flocks} payrollHistory={payrollHistory} onAddEmployee={handleAddEmployee} onUpdateEmployee={handleUpdateEmployee} onDeleteEmployee={handleDeleteEmployee} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onAddTransaction={handleAddTransaction} onAddPayrollRun={handleAddPayrollRun} />;
      case 'SETTINGS': return <SettingsModule farmProfile={farmProfile} onUpdateProfile={handleUpdateProfile} onResetData={() => {}} onExportData={() => {}} />;
      default: return <div>Page not found</div>;
    }
  };

  if (isAuthChecking) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 text-primary-600 animate-spin" /></div>;
  if (!session) return <Auth />;

  return (
    <>
      <Layout currentView={currentView} onNavigate={handleNavigate} notifications={notifications} onMarkAsRead={handleMarkAsRead} onClearAllNotifications={handleClearNotifications} currentUser={currentUser} onUpdateUser={handleUpdateUser} onLogout={handleLogout}>
        {renderContent()}
      </Layout>
      <DatabaseSetup isOpen={showDbSetup} onDismiss={() => setShowDbSetup(false)} />
    </>
  );
};

export default App;