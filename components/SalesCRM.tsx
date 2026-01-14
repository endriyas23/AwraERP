import React, { useState, useMemo } from 'react';
import { SalesOrder, Customer, InventoryItem, Flock, OrderItem, OrderStatus, FarmProfile } from '../types';
import { 
  ShoppingBag, 
  Users, 
  Plus, 
  Search, 
  FileText, 
  Filter, 
  Trash2, 
  Edit, 
  X, 
  Save, 
  Check, 
  Package, 
  Trash, 
  Printer,
  Phone,
  MapPin,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  MoreVertical,
  BarChart2,
  LayoutTemplate,
  List,
  TrendingUp,
  Award,
  Zap,
  PieChart,
  Bird
} from 'lucide-react';

interface SalesCRMProps {
  orders: SalesOrder[];
  customers: Customer[];
  inventoryItems: InventoryItem[];
  flocks: Flock[];
  farmProfile: FarmProfile;
  onAddOrder: (order: SalesOrder) => void;
  onUpdateOrder: (order: SalesOrder) => void;
  onDeleteOrder: (id: string) => void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onUpdateInventory: (item: InventoryItem) => void;
  onUpdateFlock: (flock: Flock) => void;
}

const SalesCRM: React.FC<SalesCRMProps> = ({ 
  orders, 
  customers, 
  inventoryItems, 
  flocks, 
  farmProfile,
  onAddOrder, 
  onUpdateOrder, 
  onDeleteOrder, 
  onAddCustomer, 
  onUpdateCustomer, 
  onDeleteCustomer, 
  onUpdateInventory, 
  onUpdateFlock
}) => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'CUSTOMERS' | 'ANALYTICS'>('ORDERS');
  const [orderViewMode, setOrderViewMode] = useState<'LIST' | 'BOARD'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  
  // Modals State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Selection State
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{type: 'ORDER' | 'CUSTOMER', id: string} | null>(null);

  // Forms
  const [orderForm, setOrderForm] = useState<Partial<SalesOrder> & { vatRate: number; whtRate: number }>({
    date: new Date().toISOString().split('T')[0],
    status: 'PENDING',
    items: [],
    customerId: '',
    paymentMethod: 'CASH',
    vatRate: 0,
    whtRate: 0
  });

  const [customerForm, setCustomerForm] = useState<Partial<Customer>>({
    name: '',
    type: 'RETAIL',
    phone: '',
    email: '',
    address: ''
  });

  const [newItemLine, setNewItemLine] = useState<{
    sourceType: 'INVENTORY' | 'FLOCK';
    sourceId: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>({
    sourceType: 'INVENTORY',
    sourceId: '',
    description: '',
    quantity: 0,
    unit: 'units',
    unitPrice: 0
  });

  const currencySymbol = farmProfile.currencySymbol || '$';

  // --- Calculations ---

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            o.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, searchTerm, statusFilter]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  // Form Calculations
  const formSubtotal = useMemo(() => {
    return (orderForm.items || []).reduce((acc, item) => acc + item.total, 0);
  }, [orderForm.items]);

  const formVat = formSubtotal * (orderForm.vatRate / 100);
  const formWht = formSubtotal * (orderForm.whtRate / 100);
  const formTotal = formSubtotal + formVat - formWht;

  // --- Advanced Segments & Analytics ---

  const getCustomerSegment = (c: Customer) => {
    // 1. VIP: High Spend (> $5000)
    if (c.totalSpent > 5000) return { label: 'VIP', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Award size={12} /> };
    
    // 2. Loyal: Frequent Orders (> 5)
    if (c.totalOrders > 5) return { label: 'Loyal', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <CheckCircle2 size={12} /> };
    
    // 3. New: Joined < 30 days
    const joined = new Date(c.joinedDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - joined.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 30) return { label: 'New', color: 'bg-green-100 text-green-700 border-green-200', icon: <Zap size={12} /> };
    
    // Default
    return { label: 'Regular', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: null };
  };

  const analyticsData = useMemo<{
    totalRevenue: number;
    avgOrderValue: number;
    categorySales: Record<string, number>;
    monthlyRevenue: { month: string; revenue: number; order: number }[];
  }>(() => {
    const totalRevenue = orders.reduce((acc, o) => acc + (o.status !== 'CANCELLED' ? o.totalAmount : 0), 0);
    const totalOrdersCount = orders.filter(o => o.status !== 'CANCELLED').length;
    const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

    // Sales by Product Category (Simplified from items)
    const categorySales: Record<string, number> = {};
    orders.forEach(o => {
        if (o.status === 'CANCELLED') return;
        o.items.forEach(i => {
            // Rudimentary categorization based on description keywords
            let cat = 'Other';
            const desc = i.description.toLowerCase();
            if (desc.includes('egg')) cat = 'Eggs';
            else if (desc.includes('chicken') || desc.includes('broiler') || desc.includes('bird')) cat = 'Live Birds';
            else if (desc.includes('manure')) cat = 'Manure';
            
            const currentTotal = categorySales[cat] || 0;
            categorySales[cat] = currentTotal + i.total;
        });
    });

    // Monthly Revenue Trend (Last 6 months)
    const monthlyRevenue = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
        const revenue = orders
            .filter(o => o.date.startsWith(monthKey) && o.status !== 'CANCELLED')
            .reduce((sum: number, o) => sum + o.totalAmount, 0);
        return { 
            month: d.toLocaleString('default', { month: 'short' }), 
            revenue,
            order: i // for sorting
        };
    }).sort((a, b) => b.order - a.order);

    return { totalRevenue, avgOrderValue, categorySales, monthlyRevenue };
  }, [orders]);

  // --- Handlers ---

  const handleOpenOrderModal = (order?: SalesOrder) => {
    if (order) {
      setEditingOrderId(order.id);
      setOrderForm({
        ...order,
        vatRate: order.vatRate || 0,
        whtRate: order.whtRate || 0
      });
    } else {
      setEditingOrderId(null);
      setOrderForm({
        date: new Date().toISOString().split('T')[0],
        status: 'PENDING',
        items: [],
        customerId: '',
        paymentMethod: 'CASH',
        vatRate: farmProfile.taxRateDefault || 0,
        whtRate: 0
      });
    }
    setNewItemLine({
        sourceType: 'INVENTORY',
        sourceId: '',
        description: '',
        quantity: 0,
        unit: 'units',
        unitPrice: 0
    });
    setIsOrderModalOpen(true);
  };

  const handleOpenCustomerModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomerId(customer.id);
      setCustomerForm({ ...customer });
    } else {
      setEditingCustomerId(null);
      setCustomerForm({
        name: '',
        type: 'RETAIL',
        phone: '',
        email: '',
        address: ''
      });
    }
    setIsCustomerModalOpen(true);
  };

  const getCurrentMaxStock = () => {
    if (!newItemLine.sourceId) return 0;
    if (newItemLine.sourceType === 'INVENTORY') {
        const item = inventoryItems.find(i => i.id === newItemLine.sourceId);
        return item ? item.quantity : 0;
    } else {
        const flock = flocks.find(f => f.id === newItemLine.sourceId);
        return flock ? flock.currentCount : 0;
    }
  };

  const handleAddItemToOrder = () => {
    if (!newItemLine.description || newItemLine.quantity <= 0) return;
    
    // Validate Stock if creating new or adding more
    const maxStock = getCurrentMaxStock();
    // Simplified validation: only warns based on current stock.
    if (newItemLine.quantity > maxStock) {
        alert(`Warning: Quantity exceeds current available stock (${maxStock}). Ensure stock is sufficient before fulfilling.`);
    }

    const newItem: OrderItem = {
        description: newItemLine.description,
        quantity: newItemLine.quantity,
        unit: newItemLine.unit,
        unitPrice: newItemLine.unitPrice,
        total: newItemLine.quantity * newItemLine.unitPrice,
        inventoryItemId: newItemLine.sourceType === 'INVENTORY' ? newItemLine.sourceId : undefined,
        flockId: newItemLine.sourceType === 'FLOCK' ? newItemLine.sourceId : undefined
    };

    setOrderForm(prev => ({
        ...prev,
        items: [...(prev.items || []), newItem]
    }));

    // Reset Line Item Form
    setNewItemLine({
        sourceType: 'INVENTORY',
        sourceId: '',
        description: '',
        quantity: 0,
        unit: 'units',
        unitPrice: 0
    });
  };

  const handleRemoveItemFromOrder = (index: number) => {
    setOrderForm(prev => ({
        ...prev,
        items: (prev.items || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.customerId || (orderForm.items?.length || 0) === 0) return;

    const customer = customers.find(c => c.id === orderForm.customerId);
    if (!customer) return;

    const finalOrder: SalesOrder = {
        id: editingOrderId || `ord-${Date.now()}`,
        customerId: orderForm.customerId,
        customerName: customer.name,
        date: orderForm.date || new Date().toISOString(),
        items: orderForm.items || [],
        totalAmount: formTotal,
        subTotal: formSubtotal,
        vatAmount: formVat,
        whtAmount: formWht,
        vatRate: orderForm.vatRate,
        whtRate: orderForm.whtRate,
        status: orderForm.status as OrderStatus,
        paymentMethod: orderForm.paymentMethod as any,
        notes: orderForm.notes
    };

    if (editingOrderId) {
        onUpdateOrder(finalOrder);
    } else {
        onAddOrder(finalOrder);
        
        // --- STOCK REDUCTION LOGIC ---
        finalOrder.items.forEach(item => {
            // 1. Inventory Reduction
            if (item.inventoryItemId) {
                const invItem = inventoryItems.find(i => i.id === item.inventoryItemId);
                if (invItem) {
                    onUpdateInventory({
                        ...invItem,
                        quantity: Math.max(0, invItem.quantity - item.quantity),
                        lastUpdated: new Date().toISOString().split('T')[0]
                    });
                }
            }

            // 2. Flock Reduction (Live Sales)
            if (item.flockId) {
                const flock = flocks.find(f => f.id === item.flockId);
                if (flock) {
                    onUpdateFlock({
                        ...flock,
                        currentCount: Math.max(0, flock.currentCount - item.quantity),
                        totalSold: (flock.totalSold || 0) + item.quantity
                    });
                }
            }
        });
    }

    setIsOrderModalOpen(false);
  };

  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const customer: Customer = {
        id: editingCustomerId || `cust-${Date.now()}`,
        name: customerForm.name || 'New Customer',
        type: customerForm.type as any,
        phone: customerForm.phone || '',
        email: customerForm.email,
        address: customerForm.address,
        totalOrders: editingCustomerId ? (customers.find(c => c.id === editingCustomerId)?.totalOrders || 0) : 0,
        totalSpent: editingCustomerId ? (customers.find(c => c.id === editingCustomerId)?.totalSpent || 0) : 0,
        joinedDate: editingCustomerId ? (customers.find(c => c.id === editingCustomerId)?.joinedDate || '') : new Date().toISOString().split('T')[0]
    };

    if (editingCustomerId) {
        onUpdateCustomer(customer);
    } else {
        onAddCustomer(customer);
    }
    setIsCustomerModalOpen(false);
  };

  const confirmDelete = (type: 'ORDER' | 'CUSTOMER', id: string) => {
      setItemToDelete({ type, id });
      setIsDeleteConfirmOpen(true);
  };

  const executeDelete = () => {
      if (!itemToDelete) return;
      
      if (itemToDelete.type === 'ORDER') {
          onDeleteOrder(itemToDelete.id);
      } else {
          onDeleteCustomer(itemToDelete.id);
      }
      setIsDeleteConfirmOpen(false);
      setItemToDelete(null);
  };

  const openInvoice = (order: SalesOrder) => {
      setSelectedOrder(order);
      setIsInvoiceOpen(true);
  };

  // Helper for Kanban Status Change
  const advanceOrderStatus = (order: SalesOrder) => {
      let nextStatus: OrderStatus | null = null;
      if (order.status === 'PENDING') nextStatus = 'PAID';
      else if (order.status === 'PAID') nextStatus = 'DELIVERED';
      
      if (nextStatus) {
          onUpdateOrder({ ...order, status: nextStatus });
      }
  };

  const renderKanbanBoard = () => {
      const columns: { id: OrderStatus, label: string, color: string }[] = [
          { id: 'PENDING', label: 'Pending Payment', color: 'bg-orange-50 border-orange-100' },
          { id: 'PAID', label: 'Paid / Processing', color: 'bg-blue-50 border-blue-100' },
          { id: 'DELIVERED', label: 'Delivered', color: 'bg-green-50 border-green-100' },
          { id: 'CANCELLED', label: 'Cancelled', color: 'bg-slate-50 border-slate-100' }
      ];

      return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-[calc(100vh-220px)] overflow-y-hidden">
              {columns.map(col => (
                  <div key={col.id} className={`flex flex-col h-full rounded-xl border ${col.color} backdrop-blur-sm`}>
                      <div className="p-3 border-b border-inherit font-bold text-sm text-slate-700 flex justify-between items-center bg-white/50 rounded-t-xl">
                          {col.label}
                          <span className="bg-white px-2 py-0.5 rounded-full text-xs border border-slate-100">
                              {filteredOrders.filter(o => o.status === col.id).length}
                          </span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-3">
                          {filteredOrders.filter(o => o.status === col.id).map(order => (
                              <div key={order.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                                  <div className="flex justify-between items-start mb-2">
                                      <span className="font-mono text-[10px] text-slate-400">#{order.id.split('-')[1]}</span>
                                      <div className="text-right">
                                          <div className="font-bold text-slate-900 text-sm">{currencySymbol}{order.totalAmount.toLocaleString()}</div>
                                      </div>
                                  </div>
                                  <div className="font-medium text-slate-800 text-sm mb-1">{order.customerName}</div>
                                  <div className="text-xs text-slate-500 mb-3">{order.date}</div>
                                  
                                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                      <button 
                                        onClick={() => handleOpenOrderModal(order)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"
                                      >
                                          <Edit size={14} />
                                      </button>
                                      
                                      {col.id !== 'DELIVERED' && col.id !== 'CANCELLED' && (
                                          <button 
                                            onClick={() => advanceOrderStatus(order)}
                                            className="flex items-center gap-1 text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded hover:bg-primary-100 transition-colors"
                                          >
                                              Next <ArrowRight size={12} />
                                          </button>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      );
  };

  const renderAnalytics = () => {
      const maxRev = Math.max(...analyticsData.monthlyRevenue.map(m => m.revenue), 100);
      
      return (
          <div className="space-y-6 animate-in fade-in duration-300">
              {/* Summary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-slate-500 uppercase">Total Revenue</p>
                          <div className="p-2 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={20}/></div>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">{currencySymbol}{analyticsData.totalRevenue.toLocaleString()}</h3>
                      <p className="text-xs text-slate-400 mt-1">Lifetime sales volume</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-slate-500 uppercase">Avg Order Value</p>
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart2 size={20}/></div>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">{currencySymbol}{analyticsData.avgOrderValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
                      <p className="text-xs text-slate-400 mt-1">Per transaction average</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-slate-500 uppercase">Top Category</p>
                          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Award size={20}/></div>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">
                          {Object.entries(analyticsData.categorySales).sort((a,b) => (b[1] as number)-(a[1] as number))[0]?.[0] || 'N/A'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Highest revenue driver</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue Chart */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-6">Revenue Trend (6 Months)</h3>
                      <div className="h-64 flex items-end justify-between gap-2">
                          {analyticsData.monthlyRevenue.map((data, idx) => (
                              <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative">
                                  <div className="mb-2 opacity-0 group-hover:opacity-100 absolute bottom-full text-xs font-bold bg-slate-800 text-white px-2 py-1 rounded transition-opacity">
                                      {currencySymbol}{data.revenue.toLocaleString()}
                                  </div>
                                  <div 
                                    className="w-full bg-primary-500 hover:bg-primary-600 rounded-t-lg transition-all relative"
                                    style={{ height: `${(data.revenue / maxRev) * 100}%`, minHeight: '4px' }}
                                  ></div>
                                  <div className="mt-2 text-xs text-slate-500 font-medium">{data.month}</div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Category Breakdown */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-6">Sales by Product Type</h3>
                      <div className="space-y-4">
                          {Object.entries(analyticsData.categorySales)
                              .sort((a, b) => (b[1] as number) - (a[1] as number))
                              .map(([cat, amountVal], idx) => {
                                  const amount = amountVal as number;
                                  const total = (Object.values(analyticsData.categorySales) as number[]).reduce((a, b) => a + b, 0);
                                  const pct = total > 0 ? (amount / total) * 100 : 0;
                                  return (
                                      <div key={idx}>
                                          <div className="flex justify-between text-sm mb-1">
                                              <span className="font-medium text-slate-700">{cat}</span>
                                              <span className="text-slate-500">{currencySymbol}{amount.toLocaleString()} ({pct.toFixed(0)}%)</span>
                                          </div>
                                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                              <div 
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${pct}%`, opacity: 1 - (idx * 0.15) }}
                                              ></div>
                                          </div>
                                      </div>
                                  );
                              })
                          }
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales & CRM</h1>
          <p className="text-slate-500 text-sm mt-1">Manage customer orders, invoices, and relationships.</p>
        </div>
        
        <div className="bg-white p-1 rounded-lg border border-slate-200 flex">
           <button 
             onClick={() => setActiveTab('ORDERS')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'ORDERS' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <ShoppingBag size={16} /> Orders
           </button>
           <button 
             onClick={() => setActiveTab('CUSTOMERS')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'CUSTOMERS' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <Users size={16} /> Customers
           </button>
           <button 
             onClick={() => setActiveTab('ANALYTICS')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'ANALYTICS' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <BarChart2 size={16} /> Analytics
           </button>
        </div>
      </div>

      {activeTab === 'ORDERS' && (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* View Switcher */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setOrderViewMode('LIST')}
                            className={`p-1.5 rounded-md transition-colors ${orderViewMode === 'LIST' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                            title="List View"
                        >
                            <List size={16} />
                        </button>
                        <button 
                            onClick={() => setOrderViewMode('BOARD')}
                            className={`p-1.5 rounded-md transition-colors ${orderViewMode === 'BOARD' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Kanban Board View"
                        >
                            <LayoutTemplate size={16} />
                        </button>
                    </div>

                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Search orders..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full md:w-64"
                        />
                    </div>
                    
                    {orderViewMode === 'LIST' && (
                        <div className="relative">
                            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white appearance-none cursor-pointer"
                            >
                            <option value="ALL">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="PAID">Paid</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    )}
                </div>
                <button 
                  onClick={() => handleOpenOrderModal()}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm"
                >
                    <Plus size={16} /> New Order
                </button>
            </div>

            {/* View Rendering */}
            {orderViewMode === 'BOARD' ? renderKanbanBoard() : (
                /* List View */
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Order ID</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOrders.length > 0 ? filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">#{order.id.split('-')[1] || order.id}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{order.customerName}</td>
                                    <td className="px-6 py-4 text-slate-600">{order.date}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border
                                            ${order.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' : 
                                            order.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                            order.status === 'DELIVERED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            'bg-red-50 text-red-700 border-red-200'
                                            }
                                        `}>
                                            {order.status === 'PAID' && <CheckCircle2 size={12} />}
                                            {order.status === 'PENDING' && <Clock size={12} />}
                                            {order.status === 'DELIVERED' && <Package size={12} />}
                                            {order.status === 'CANCELLED' && <X size={12} />}
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-800">{currencySymbol}{order.totalAmount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => openInvoice(order)}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                                title="View Invoice"
                                            >
                                                <FileText size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleOpenOrderModal(order)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                title="Edit Order"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => confirmDelete('ORDER', order.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Delete Order"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">No orders found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'ANALYTICS' && renderAnalytics()}

      {/* CUSTOMERS TAB */}
      {activeTab === 'CUSTOMERS' && (
        <div className="space-y-4 animate-in fade-in duration-300">
             <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full md:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search customers..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
                <button 
                  onClick={() => handleOpenCustomerModal()}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm"
                >
                    <Plus size={16} /> Add Customer
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.length > 0 ? filteredCustomers.map(customer => {
                    const segment = getCustomerSegment(customer);
                    return (
                        <div key={customer.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group relative">
                            {/* Segment Badge */}
                            <div className={`absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase flex items-center gap-1 ${segment.color}`}>
                                {segment.icon} {segment.label}
                            </div>

                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                                        {customer.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{customer.name}</h3>
                                        <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{customer.type}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-sm text-slate-600 mb-4">
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" /> {customer.phone}
                                </div>
                                {customer.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} className="text-slate-400" /> {customer.email}
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-slate-400" /> {customer.address}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-400 font-medium uppercase">Total Spent</p>
                                    <p className="text-lg font-bold text-slate-900">{currencySymbol}{customer.totalSpent.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-medium uppercase">Orders</p>
                                    <p className="text-lg font-bold text-slate-900">{customer.totalOrders}</p>
                                </div>
                            </div>

                            {/* Hover Actions */}
                            <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2">
                                <button onClick={() => handleOpenCustomerModal(customer)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded bg-slate-50 hover:bg-blue-50 border border-slate-100"><Edit size={16} /></button>
                                <button onClick={() => confirmDelete('CUSTOMER', customer.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded bg-slate-50 hover:bg-red-50 border border-slate-100"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        No customers found matching your search.
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Invoice Modal */}
      {isInvoiceOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:w-full print:h-full print:shadow-none print:fixed print:inset-0">
               <div className="p-4 border-b border-slate-200 flex justify-between items-center print:hidden">
                  <h3 className="font-bold text-lg text-slate-900">Invoice #{selectedOrder.id}</h3>
                  <div className="flex gap-2">
                      <button onClick={() => window.print()} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full flex items-center gap-2 px-4 bg-slate-50 border border-slate-200">
                          <Printer size={16} /> Print
                      </button>
                      <button onClick={() => setIsInvoiceOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
                          <X size={24} />
                      </button>
                  </div>
               </div>

               <div className="p-8 print:p-8" id="invoice-content">
                  {/* Invoice Header */}
                  <div className="flex justify-between items-start mb-8">
                     <div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-1">{farmProfile.name}</h1>
                        <div className="text-sm text-slate-500 space-y-0.5">
                            <p>{farmProfile.address}</p>
                            <p>{farmProfile.city}</p>
                            <p>{farmProfile.phone}</p>
                            <p>{farmProfile.email}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <h2 className="text-3xl font-bold text-slate-200 uppercase tracking-widest mb-2">Invoice</h2>
                        <div className="text-sm text-slate-600">
                            <p className="font-bold text-slate-900">#{selectedOrder.id.split('-')[1] || selectedOrder.id}</p>
                            <p>Date: {selectedOrder.date.split('T')[0]}</p>
                        </div>
                     </div>
                  </div>

                  {/* Bill To */}
                  <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100 print:bg-transparent print:border-none print:p-0">
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bill To:</p>
                     <h3 className="text-lg font-bold text-slate-900">{selectedOrder.customerName}</h3>
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-sm mb-8">
                      <thead>
                          <tr className="border-b-2 border-slate-200">
                              <th className="text-left py-3 font-bold text-slate-700">Description</th>
                              <th className="text-right py-3 font-bold text-slate-700">Qty</th>
                              <th className="text-right py-3 font-bold text-slate-700">Price</th>
                              <th className="text-right py-3 font-bold text-slate-700">Total</th>
                          </tr>
                      </thead>
                      <tbody>
                          {selectedOrder.items.map((item, i) => (
                              <tr key={i} className="border-b border-slate-100">
                                  <td className="py-3 text-slate-600">{item.description}</td>
                                  <td className="py-3 text-right text-slate-600">{item.quantity} {item.unit}</td>
                                  <td className="py-3 text-right text-slate-600">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                                  <td className="py-3 text-right font-medium text-slate-900">{currencySymbol}{item.total.toFixed(2)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>

                  {/* Totals */}
                  <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                          <div className="flex justify-between text-sm text-slate-600">
                              <span>Subtotal:</span>
                              <span>{currencySymbol}{selectedOrder.subTotal?.toLocaleString()}</span>
                          </div>
                          {(selectedOrder.vatAmount || 0) > 0 && (
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>VAT ({selectedOrder.vatRate}%):</span>
                                <span>{currencySymbol}{selectedOrder.vatAmount?.toLocaleString()}</span>
                            </div>
                          )}
                          {(selectedOrder.whtAmount || 0) > 0 && (
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>WHT ({selectedOrder.whtRate}%):</span>
                                <span>-{currencySymbol}{selectedOrder.whtAmount?.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold text-slate-900 border-t-2 border-slate-800 pt-2">
                              <span>Total:</span>
                              <span>{currencySymbol}{selectedOrder.totalAmount.toLocaleString()}</span>
                          </div>
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-12 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
                      <p>Thank you for your business!</p>
                  </div>
               </div>
           </div>
        </div>
      )}

      {/* Order Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <ShoppingBag size={20} className="text-primary-600" /> 
                    {editingOrderId ? 'Edit Sales Order' : 'New Sales Order'}
                </h3>
                <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
             </div>
             
             <form onSubmit={handleSubmitOrder} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Customer <span className="text-red-500">*</span></label>
                      <select 
                        required
                        value={orderForm.customerId}
                        onChange={(e) => setOrderForm({...orderForm, customerId: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                      >
                         <option value="">Select Customer...</option>
                         {customers.map(c => (
                           <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                         ))}
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                      <input 
                        type="date" 
                        value={orderForm.date}
                        onChange={(e) => setOrderForm({...orderForm, date: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                      <select 
                        value={orderForm.status}
                        onChange={(e) => setOrderForm({...orderForm, status: e.target.value as OrderStatus})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                      >
                         <option value="PENDING">Pending</option>
                         <option value="PAID">Paid</option>
                         <option value="DELIVERED">Delivered</option>
                         <option value="CANCELLED">Cancelled</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                      <select 
                        value={orderForm.paymentMethod}
                        onChange={(e) => setOrderForm({...orderForm, paymentMethod: e.target.value as any})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                      >
                         <option value="CASH">Cash</option>
                         <option value="TRANSFER">Bank Transfer</option>
                         <option value="CHECK">Check</option>
                         <option value="MOBILE_MONEY">Mobile Money</option>
                      </select>
                   </div>
                </div>

                {/* Line Items Section */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Package size={16} /> Order Items
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4 p-3 bg-white border border-slate-200 rounded-lg">
                        <div className="md:col-span-12 flex gap-4 mb-1">
                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="sourceType" 
                                  checked={newItemLine.sourceType === 'INVENTORY'}
                                  onChange={() => setNewItemLine({
                                      ...newItemLine, 
                                      sourceType: 'INVENTORY', 
                                      sourceId: '',
                                      description: '',
                                      unit: 'units'
                                  })}
                                  className="text-primary-600 focus:ring-primary-500"
                                />
                                Inventory Item
                            </label>
                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="sourceType" 
                                  checked={newItemLine.sourceType === 'FLOCK'}
                                  onChange={() => setNewItemLine({
                                      ...newItemLine, 
                                      sourceType: 'FLOCK', 
                                      sourceId: '',
                                      description: '',
                                      unit: 'birds'
                                  })}
                                  className="text-primary-600 focus:ring-primary-500"
                                />
                                Live Bird Sale
                            </label>
                        </div>

                        <div className="md:col-span-4">
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Item Source</label>
                            <select 
                                value={newItemLine.sourceId}
                                onChange={(e) => {
                                    const id = e.target.value;
                                    if (newItemLine.sourceType === 'INVENTORY') {
                                        const item = inventoryItems.find(i => i.id === id);
                                        setNewItemLine({
                                            ...newItemLine,
                                            sourceId: id,
                                            description: item ? item.name : '',
                                            unit: item ? item.unit : 'units',
                                            unitPrice: item ? item.costPerUnit * 1.2 : 0 // Suggest 20% margin
                                        });
                                    } else {
                                        const flock = flocks.find(f => f.id === id);
                                        setNewItemLine({
                                            ...newItemLine,
                                            sourceId: id,
                                            description: flock ? `Live Birds - ${flock.name}` : '',
                                            unit: 'birds',
                                            unitPrice: 0
                                        });
                                    }
                                }}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none bg-white"
                            >
                                <option value="">Select...</option>
                                {newItemLine.sourceType === 'INVENTORY' ? (
                                    inventoryItems.map(i => (
                                        <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>
                                    ))
                                ) : (
                                    flocks.filter(f => f.status === 'Active' || f.status === 'Quarantine').map(f => (
                                        <option key={f.id} value={f.id}>{f.name} ({f.currentCount} birds)</option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Description</label>
                            <input 
                                type="text"
                                value={newItemLine.description}
                                onChange={(e) => setNewItemLine({...newItemLine, description: e.target.value})}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none"
                                placeholder="Item name"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Qty</label>
                            <input 
                                type="number" 
                                min="1"
                                value={newItemLine.quantity}
                                onChange={(e) => setNewItemLine({...newItemLine, quantity: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none"
                            />
                            <div className="text-[10px] text-slate-400 text-right mt-0.5">
                                Max: {getCurrentMaxStock()}
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Price</label>
                            <input 
                                type="number" 
                                min="0"
                                step="0.01"
                                value={newItemLine.unitPrice}
                                onChange={(e) => setNewItemLine({...newItemLine, unitPrice: Number(e.target.value)})}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm outline-none"
                            />
                        </div>

                        <div className="md:col-span-1 flex items-end">
                            <button 
                                type="button"
                                onClick={handleAddItemToOrder}
                                className="w-full h-[34px] bg-slate-800 text-white rounded flex items-center justify-center hover:bg-slate-700 transition-colors"
                                title="Add Item"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {(orderForm.items || []).length > 0 ? (
                        <div className="bg-white rounded border border-slate-200 overflow-hidden">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 font-medium text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2">Description</th>
                                        <th className="px-3 py-2 text-right">Qty</th>
                                        <th className="px-3 py-2 text-right">Price</th>
                                        <th className="px-3 py-2 text-right">Total</th>
                                        <th className="px-3 py-2 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {orderForm.items!.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1">
                                                    {item.flockId && <Bird size={12} className="text-primary-500" />}
                                                    {item.description}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                                            <td className="px-3 py-2 text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right font-bold">{currencySymbol}{item.total.toFixed(2)}</td>
                                            <td className="px-3 py-2 text-center">
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRemoveItemFromOrder(idx)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                                    <tr>
                                        <td colSpan={3} className="px-3 py-2 text-right">Subtotal:</td>
                                        <td className="px-3 py-2 text-right">{currencySymbol}{formSubtotal.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-slate-400 text-sm bg-white rounded border border-dashed border-slate-300">
                            No items added yet. Use the form above to add products.
                        </div>
                    )}
                </div>

                {/* Financial Totals & Tax */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                        <textarea 
                            rows={3}
                            value={orderForm.notes || ''}
                            onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                            placeholder="Delivery notes, instructions..."
                        ></textarea>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Subtotal</span>
                            <span className="font-bold text-slate-900">{currencySymbol}{formSubtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-600">VAT (%)</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={orderForm.vatRate}
                                    onChange={(e) => setOrderForm({...orderForm, vatRate: Number(e.target.value)})}
                                    className="w-16 px-1 py-0.5 border border-slate-300 rounded text-xs text-right outline-none"
                                />
                            </div>
                            <span className="text-slate-700">+{currencySymbol}{formVat.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-600">WHT (%)</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={orderForm.whtRate}
                                    onChange={(e) => setOrderForm({...orderForm, whtRate: Number(e.target.value)})}
                                    className="w-16 px-1 py-0.5 border border-slate-300 rounded text-xs text-right outline-none"
                                />
                            </div>
                            <span className="text-red-500">-{currencySymbol}{formWht.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>

                        <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-base font-bold text-slate-900">Grand Total</span>
                            <span className="text-xl font-bold text-primary-600">{currencySymbol}{formTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                   <button 
                     type="button" 
                     onClick={() => setIsOrderModalOpen(false)}
                     className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     disabled={(orderForm.items || []).length === 0 || !orderForm.customerId}
                     className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <Save size={18} /> {editingOrderId ? 'Update Order' : 'Create Order'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
             <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900">{editingCustomerId ? 'Edit Customer' : 'Add New Customer'}</h3>
                <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
             </div>
             <form onSubmit={handleSubmitCustomer} className="p-6 space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name <span className="text-red-500">*</span></label>
                   <input 
                     required
                     type="text" 
                     value={customerForm.name}
                     onChange={e => setCustomerForm({...customerForm, name: e.target.value})}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                   <select 
                     value={customerForm.type}
                     onChange={e => setCustomerForm({...customerForm, type: e.target.value as any})}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                   >
                      <option value="WHOLESALE">Wholesale / Distributor</option>
                      <option value="RETAIL">Retail / Individual</option>
                      <option value="RESTAURANT">Restaurant / Hotel</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                   <input 
                     required
                     type="tel" 
                     value={customerForm.phone}
                     onChange={e => setCustomerForm({...customerForm, phone: e.target.value})}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Email (Optional)</label>
                   <input 
                     type="email" 
                     value={customerForm.email}
                     onChange={e => setCustomerForm({...customerForm, email: e.target.value})}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                   <input 
                     type="text" 
                     value={customerForm.address}
                     onChange={e => setCustomerForm({...customerForm, address: e.target.value})}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                   />
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                   <button 
                     type="button" 
                     onClick={() => setIsCustomerModalOpen(false)}
                     className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2"
                   >
                     <Save size={18} /> {editingCustomerId ? 'Update Customer' : 'Save Customer'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <Trash2 size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Delete {itemToDelete.type === 'ORDER' ? 'Order' : 'Customer'}?</h3>
              <p className="text-slate-500 text-sm mb-6">
                 Are you sure you want to delete this {itemToDelete.type === 'ORDER' ? 'order' : 'customer'}? This action cannot be undone.
                 {itemToDelete.type === 'ORDER' && (
                     <span className="block mt-2 text-xs text-orange-600 font-medium">
                         Note: Stock deducted by this order will be reverted automatically.
                     </span>
                 )}
              </p>
              <div className="flex gap-3">
                 <button 
                   onClick={() => { setIsDeleteConfirmOpen(false); setItemToDelete(null); }}
                   className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={executeDelete}
                   className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                 >
                   Delete
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SalesCRM;