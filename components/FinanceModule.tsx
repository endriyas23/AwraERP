import React, { useState, useMemo } from 'react';
import { 
  Transaction, 
  Flock, 
  TransactionType,
  SalesOrder,
  ViewState,
  InventoryItem,
  FarmProfile
} from '../types';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Calendar, 
  Filter, 
  Download, 
  Plus, 
  CreditCard,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  X,
  Save,
  BarChart3,
  Layers,
  Percent,
  Users,
  Zap,
  Wheat,
  Pill,
  Wrench,
  Truck,
  ArrowUpDown,
  CalendarRange,
  Activity,
  Wallet,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  AlertTriangle,
  Landmark,
  FileSpreadsheet,
  Scale,
  ShoppingBag
} from 'lucide-react';

interface FinanceModuleProps {
  transactions: Transaction[];
  flocks: Flock[];
  orders: SalesOrder[]; 
  inventoryItems: InventoryItem[];
  farmProfile: FarmProfile;
  onAddTransaction: (transaction: Transaction) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateOrder: (order: SalesOrder) => void;
  onNavigate: (view: ViewState) => void;
}

const FinanceModule: React.FC<FinanceModuleProps> = ({ 
  transactions, 
  flocks,
  orders,
  inventoryItems,
  farmProfile,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onUpdateOrder,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRANSACTIONS' | 'STATEMENTS' | 'TAX'>('OVERVIEW');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  
  // Advanced Filters
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'AMT_DESC' | 'AMT_ASC'>('DATE_DESC');

  // P&L Dashboard State
  const [reportTimeRange, setReportTimeRange] = useState<'30D' | 'MTD' | 'YTD' | 'ALL'>('YTD');

  // New Transaction Form
  const [txForm, setTxForm] = useState<Partial<Transaction> & { vatRate: number, whtRate: number, status: 'PENDING' | 'COMPLETED' }>({
    date: new Date().toISOString().split('T')[0],
    type: 'EXPENSE',
    category: 'Feed',
    amount: 0,
    subTotal: 0,
    vatAmount: 0,
    whtAmount: 0,
    vatRate: 0,
    whtRate: 0,
    description: '',
    flockId: '',
    status: 'COMPLETED' as any // Adding temporary status tracking for UI
  });

  const currencySymbol = farmProfile.currencySymbol || '$';

  // --- Helpers ---
  const getCategoryIcon = (category: string) => {
    if (category.includes('Feed')) return <Wheat size={16} className="text-orange-500" />;
    if (category.includes('Medicine')) return <Pill size={16} className="text-blue-500" />;
    if (category.includes('Sales')) return <ShoppingBag size={16} className="text-green-600" />;
    if (category.includes('Labor')) return <Users size={16} className="text-indigo-500" />;
    if (category.includes('Utilities')) return <Zap size={16} className="text-yellow-500" />;
    if (category.includes('Equipment')) return <Wrench size={16} className="text-slate-500" />;
    if (category.includes('Transport')) return <Truck size={16} className="text-slate-500" />;
    return <FileText size={16} className="text-slate-400" />;
  };

  // --- Financial Logic Engine ---
  
  // 1. Filter Transactions by Date/Search
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      if (dateRange.start && txDate < new Date(dateRange.start)) return false;
      if (dateRange.end && txDate > new Date(dateRange.end)) return false;
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      switch (sortBy) {
        case 'DATE_ASC': return dateA - dateB;
        case 'DATE_DESC': return dateB - dateA;
        case 'AMT_ASC': return a.amount - b.amount;
        case 'AMT_DESC': return b.amount - a.amount;
        default: return dateB - dateA;
      }
    });
  }, [transactions, dateRange, categoryFilter, sortBy]);

  // 2. Report Data (Time Range Filtered)
  const reportData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return transactions.filter(t => {
        const tDate = new Date(t.date);
        if (reportTimeRange === '30D') return tDate >= thirtyDaysAgo;
        if (reportTimeRange === 'MTD') return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        if (reportTimeRange === 'YTD') return tDate.getFullYear() === currentYear;
        return true;
    });
  }, [transactions, reportTimeRange]);

  // 3. Double-Entry Bucketing (P&L)
  const calculateFinancials = (data: Transaction[]) => {
      const financials = {
          revenue: 0,
          cogs: 0, // Direct Costs: Feed, Meds, Birds, Packaging
          opex: 0, // Operating Expenses: Labor, Utilities, Rent, Admin
          tax: 0,
          vatCollected: 0,
          vatPaid: 0,
          whtPayable: 0,
          pensionPayable: 0
      };

      data.forEach(t => {
          // Revenue
          if (t.type === 'INCOME') {
              financials.revenue += t.amount; // Net Income usually
              financials.vatCollected += (t.vatAmount || 0);
          } 
          // Expenses
          else if (t.type === 'EXPENSE') {
              financials.vatPaid += (t.vatAmount || 0);
              financials.whtPayable += (t.whtAmount || 0);
              financials.pensionPayable += (t.pensionAmount || 0);

              // COGS Classification
              if (['Feed', 'Medicine', 'Livestock Purchase', 'Packaging'].some(c => t.category.includes(c))) {
                  financials.cogs += t.amount;
              } 
              // OpEx Classification
              else {
                  financials.opex += t.amount;
              }
          }
      });

      const grossProfit = financials.revenue - financials.cogs;
      const netProfit = grossProfit - financials.opex;

      return { ...financials, grossProfit, netProfit };
  };

  const currentFinancials = calculateFinancials(reportData);
  const totalFinancials = calculateFinancials(transactions); // All time for Balance Sheet

  // 4. Balance Sheet Calculations
  const balanceSheet = useMemo(() => {
      // Assets
      const cashOnHand = totalFinancials.revenue - totalFinancials.cogs - totalFinancials.opex; // Simplified Cash Basis
      const inventoryValue = inventoryItems.reduce((acc, item) => acc + (item.quantity * item.costPerUnit), 0);
      const bioAssetsValue = flocks.filter(f => f.status === 'Active').reduce((acc, f) => {
          // Estimated value: Initial Cost per bird * current count (Simplified)
          const unitCost = (f.initialCost || 0) / (f.initialCount || 1); 
          return acc + (f.currentCount * unitCost);
      }, 0);
      const accountsReceivable = orders
          .filter(o => o.status === 'PENDING' || o.status === 'DELIVERED')
          .reduce((acc, o) => acc + o.totalAmount, 0);
      
      const totalAssets = cashOnHand + inventoryValue + bioAssetsValue + accountsReceivable;

      // Liabilities
      // Simplified: WHT + Payroll Liabilities + Net VAT Payable (if positive)
      const netVat = totalFinancials.vatCollected - totalFinancials.vatPaid;
      const vatLiability = Math.max(0, netVat); 
      const payrollLiabilities = totalFinancials.whtPayable + totalFinancials.pensionPayable; // From historical payroll runs
      // Assuming some Accounts Payable logic if we tracked unpaid bills (Mocked as 0 for now)
      
      const totalLiabilities = vatLiability + payrollLiabilities;

      // Equity
      const equity = totalAssets - totalLiabilities;

      return {
          assets: { cash: cashOnHand, inventory: inventoryValue, bio: bioAssetsValue, receivable: accountsReceivable, total: totalAssets },
          liabilities: { vat: vatLiability, payroll: payrollLiabilities, total: totalLiabilities },
          equity
      };
  }, [totalFinancials, inventoryItems, flocks, orders]);


  // --- Handlers ---

  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate final tax amounts based on rates
    const sub = Number(txForm.subTotal) || 0;
    const vRate = Number(txForm.vatRate) || 0;
    const wRate = Number(txForm.whtRate) || 0;
    
    const vatAmt = sub * (vRate / 100);
    const whtAmt = sub * (wRate / 100);
    
    // Net cash impact depends on Inflow vs Outflow
    const finalAmount = sub + vatAmt - whtAmt;

    const newTx: Transaction = {
      id: editingTxId || `tx-${Date.now()}`,
      date: txForm.date || new Date().toISOString().split('T')[0],
      type: txForm.type || 'EXPENSE',
      category: txForm.category || 'General',
      amount: finalAmount,
      subTotal: sub,
      vatAmount: vatAmt,
      whtAmount: whtAmt,
      description: txForm.description || '',
      flockId: txForm.flockId
    };
    
    if (editingTxId) {
      onUpdateTransaction(newTx);
    } else {
      onAddTransaction(newTx);
    }
    
    setIsTxModalOpen(false);
    setEditingTxId(null);
    resetForm();
  };

  const resetForm = () => {
    setTxForm({
        date: new Date().toISOString().split('T')[0],
        type: 'EXPENSE',
        category: 'Feed',
        amount: 0,
        subTotal: 0,
        vatAmount: 0,
        whtAmount: 0,
        vatRate: 0,
        whtRate: 0,
        description: '',
        flockId: '',
        status: 'COMPLETED' as any
      });
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTxId(tx.id);
    const sub = tx.subTotal || tx.amount;
    const vatRate = sub > 0 ? ((tx.vatAmount || 0) / sub) * 100 : 0;
    const whtRate = sub > 0 ? ((tx.whtAmount || 0) / sub) * 100 : 0;

    setTxForm({
      ...tx,
      vatRate: Math.round(vatRate * 10) / 10,
      whtRate: Math.round(whtRate * 10) / 10,
      status: 'COMPLETED' as any
    });
    setIsTxModalOpen(true);
  };

  const handleDeleteTx = (id: string) => {
    setDeleteConfirmationId(id);
  };

  const handleOpenAddModal = () => {
    setEditingTxId(null);
    resetForm();
    setIsTxModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Subtotal', 'VAT', 'WHT', 'Net Total', 'Description', 'Flock', 'Order Ref'];
    const rows = filteredTransactions.map(t => [
      t.date,
      t.type,
      t.category,
      (t.subTotal || t.amount).toFixed(2),
      (t.vatAmount || 0).toFixed(2),
      (t.whtAmount || 0).toFixed(2),
      t.amount.toFixed(2),
      t.description,
      t.flockId ? flocks.find(f => f.id === t.flockId)?.name : 'N/A',
      t.referenceId || ''
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "financial_records.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Render Sections (unchanged sections omitted for brevity but included in output logic) ---
  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue ({reportTimeRange})</p>
            <h3 className="text-2xl font-bold text-green-600 mt-1">{currencySymbol}{currentFinancials.revenue.toLocaleString()}</h3>
            <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                <ArrowUpRight size={12} className="text-green-500"/> Total Income
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Profit</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{currencySymbol}{currentFinancials.grossProfit.toLocaleString()}</h3>
            <div className="mt-2 text-xs text-slate-400">
                Margin: {currentFinancials.revenue > 0 ? ((currentFinancials.grossProfit / currentFinancials.revenue) * 100).toFixed(1) : 0}%
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">OpEx & Taxes</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">{currencySymbol}{currentFinancials.opex.toLocaleString()}</h3>
            <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                <ArrowDownRight size={12} className="text-red-500"/> Overhead Costs
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Profit</p>
            <h3 className={`text-2xl font-bold mt-1 ${currentFinancials.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {currencySymbol}{currentFinancials.netProfit.toLocaleString()}
            </h3>
            <div className="mt-2 text-xs text-slate-400">
                Bottom Line
            </div>
        </div>
    </div>
  );

  const renderStatements = () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
          {/* Income Statement (P&L) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <FileSpreadsheet size={18} className="text-blue-600" /> Income Statement (P&L)
                  </h3>
                  <span className="text-xs font-bold bg-white border px-2 py-1 rounded text-slate-500">{reportTimeRange}</span>
              </div>
              <div className="p-6 space-y-4">
                  {/* Revenue Section */}
                  <div>
                      <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                          <span>Revenue</span>
                          <span>{currencySymbol}{currentFinancials.revenue.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-green-100 rounded-full w-full mb-1">
                          <div className="h-full bg-green-500 rounded-full" style={{width: '100%'}}></div>
                      </div>
                  </div>

                  {/* COGS Section */}
                  <div>
                      <div className="flex justify-between text-sm font-medium text-slate-600 mb-1">
                          <span>Cost of Goods Sold (COGS)</span>
                          <span className="text-red-500">-{currencySymbol}{currentFinancials.cogs.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-slate-400 mb-2 ml-2">Feed, Medicine, Livestock, Packaging</div>
                      <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-100 pt-2">
                          <span>Gross Profit</span>
                          <span>{currencySymbol}{currentFinancials.grossProfit.toLocaleString()}</span>
                      </div>
                  </div>

                  {/* OpEx Section */}
                  <div className="pt-2">
                      <div className="flex justify-between text-sm font-medium text-slate-600 mb-1">
                          <span>Operating Expenses (OpEx)</span>
                          <span className="text-orange-500">-{currencySymbol}{currentFinancials.opex.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-slate-400 mb-2 ml-2">Labor, Utilities, Transport, Admin</div>
                  </div>

                  {/* Net Profit */}
                  <div className="pt-4 border-t-2 border-slate-100">
                      <div className="flex justify-between text-lg font-bold">
                          <span className="text-slate-900">Net Profit</span>
                          <span className={currentFinancials.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}>
                              {currencySymbol}{currentFinancials.netProfit.toLocaleString()}
                          </span>
                      </div>
                      <div className="text-right text-xs text-slate-400 mt-1">
                          Net Margin: {currentFinancials.revenue > 0 ? ((currentFinancials.netProfit / currentFinancials.revenue) * 100).toFixed(1) : 0}%
                      </div>
                  </div>
              </div>
          </div>

          {/* Balance Sheet Snapshot */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Scale size={18} className="text-purple-600" /> Balance Sheet Snapshot
                  </h3>
              </div>
              <div className="p-6">
                  <div className="space-y-6">
                      {/* Assets */}
                      <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Assets</h4>
                          <div className="space-y-2">
                              <div className="flex justify-between text-sm text-slate-600">
                                  <span>Cash on Hand (Est.)</span>
                                  <span className="font-medium">{currencySymbol}{balanceSheet.assets.cash.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm text-slate-600">
                                  <span>Inventory Value</span>
                                  <span className="font-medium">{currencySymbol}{balanceSheet.assets.inventory.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm text-slate-600">
                                  <span>Biological Assets (Birds)</span>
                                  <span className="font-medium">{currencySymbol}{balanceSheet.assets.bio.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm text-slate-600">
                                  <span>Accounts Receivable</span>
                                  <span className="font-medium">{currencySymbol}{balanceSheet.assets.receivable.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-100 pt-2 mt-2">
                                  <span>Total Assets</span>
                                  <span className="text-blue-600">{currencySymbol}{balanceSheet.assets.total.toLocaleString()}</span>
                              </div>
                          </div>
                      </div>

                      {/* Liabilities & Equity */}
                      <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Liabilities & Equity</h4>
                          <div className="space-y-2">
                              <div className="flex justify-between text-sm text-slate-600">
                                  <span>Tax & VAT Payable</span>
                                  <span className="text-red-500">{currencySymbol}{balanceSheet.liabilities.vat.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm text-slate-600">
                                  <span>Payroll Liabilities</span>
                                  <span className="text-red-500">{currencySymbol}{balanceSheet.liabilities.payroll.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm font-bold text-slate-800 pt-1">
                                  <span>Total Liabilities</span>
                                  <span>{currencySymbol}{balanceSheet.liabilities.total.toLocaleString()}</span>
                              </div>
                              
                              <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-100 pt-2 mt-2">
                                  <span>Owner's Equity</span>
                                  <span className="text-green-600">{currencySymbol}{balanceSheet.equity.toLocaleString()}</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderTaxCompliance = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Landmark size={20} className="text-slate-600" /> Tax & Compliance Engine
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* VAT Position */}
                  <div className="p-4 rounded-lg border border-slate-100 bg-slate-50">
                      <h4 className="text-sm font-bold text-slate-700 mb-3">VAT Position</h4>
                      <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                              <span className="text-slate-500">Output VAT (Sales)</span>
                              <span className="font-medium text-slate-800">+{currencySymbol}{currentFinancials.vatCollected.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-slate-500">Input VAT (Purchases)</span>
                              <span className="font-medium text-slate-800">-{currencySymbol}{currentFinancials.vatPaid.toLocaleString()}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
                              <span>Net Payable</span>
                              <span className={currentFinancials.vatCollected - currentFinancials.vatPaid > 0 ? 'text-red-600' : 'text-green-600'}>
                                  {currencySymbol}{(currentFinancials.vatCollected - currentFinancials.vatPaid).toLocaleString()}
                              </span>
                          </div>
                      </div>
                  </div>

                  {/* WHT */}
                  <div className="p-4 rounded-lg border border-slate-100 bg-slate-50">
                      <h4 className="text-sm font-bold text-slate-700 mb-3">Withholding Tax (WHT)</h4>
                      <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                              <span className="text-slate-500">Total WHT Withheld</span>
                              <span className="font-medium text-red-600">{currencySymbol}{currentFinancials.whtPayable.toLocaleString()}</span>
                          </div>
                          <div className="pt-2 text-xs text-slate-400">
                              *Amounts withheld from payments to vendors/staff that must be remitted.
                          </div>
                      </div>
                  </div>

                  {/* Payroll */}
                  <div className="p-4 rounded-lg border border-slate-100 bg-slate-50">
                      <h4 className="text-sm font-bold text-slate-700 mb-3">Payroll Liabilities</h4>
                      <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                              <span className="text-slate-500">Pension Payable</span>
                              <span className="font-medium text-red-600">{currencySymbol}{currentFinancials.pensionPayable.toLocaleString()}</span>
                          </div>
                          <div className="pt-2 text-xs text-slate-400">
                              *Employer + Employee contributions pending remittance.
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Financial Management</h1>
              <p className="text-slate-500 text-sm mt-1">Core accounting, ledger, and financial reporting.</p>
            </div>
        </div>
        
        <div className="bg-white p-1 rounded-lg border border-slate-200 flex overflow-x-auto">
           <button 
             onClick={() => setActiveTab('OVERVIEW')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'OVERVIEW' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <PieChart size={16} /> Overview
           </button>
           <button 
             onClick={() => setActiveTab('TRANSACTIONS')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'TRANSACTIONS' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <CreditCard size={16} /> Ledger
           </button>
           <button 
             onClick={() => setActiveTab('STATEMENTS')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'STATEMENTS' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <FileText size={16} /> Statements
           </button>
           <button 
             onClick={() => setActiveTab('TAX')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'TAX' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <Landmark size={16} /> Tax
           </button>
        </div>
      </div>

      {activeTab === 'OVERVIEW' && (
         <div className="space-y-6 animate-in fade-in duration-300">
             {/* Date Filter for Reports */}
             <div className="flex justify-end">
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    {['30D', 'MTD', 'YTD', 'ALL'].map((range) => (
                        <button 
                            key={range}
                            onClick={() => setReportTimeRange(range as any)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                reportTimeRange === range 
                                ? 'bg-slate-800 text-white shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
             </div>

             {renderSummaryCards()}

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Flock Economics */}
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <Activity size={18} className="text-blue-500"/> Flock Economics
                    </h3>
                    <div className="space-y-4">
                        {flocks.filter(f => f.status === 'Active' || f.status === 'Harvested').map(flock => {
                            // Calculate specific profitability per flock
                            const expenses = transactions
                                .filter(t => t.flockId === flock.id && t.type === 'EXPENSE')
                                .reduce((acc, t) => acc + t.amount, 0) + (flock.initialCost || 0);
                            
                            const income = transactions
                                .filter(t => t.flockId === flock.id && t.type === 'INCOME')
                                .reduce((acc, t) => acc + t.amount, 0);
                            
                            const profit = income - expenses;
                            const maxVal = Math.max(expenses, income, 100);

                            return (
                                <div key={flock.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-sm text-slate-700">{flock.name}</span>
                                        <span className={`text-xs font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {profit >= 0 ? '+' : ''}{currencySymbol}{profit.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full bg-white h-2 rounded-full overflow-hidden flex">
                                        <div className="bg-green-500 h-full" style={{ width: `${(income / maxVal) * 50}%` }}></div>
                                        <div className="bg-red-500 h-full" style={{ width: `${(expenses / maxVal) * 50}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                        <span>Rev: {currencySymbol}{income.toLocaleString()}</span>
                                        <span>Cost: {currencySymbol}{expenses.toLocaleString()}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                 </div>

                 {/* Cost Breakdown */}
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <PieChart size={18} className="text-orange-500"/> Expense Breakdown
                    </h3>
                    <div className="space-y-3">
                        {(() => {
                            const cats: Record<string, number> = {};
                            reportData.filter(t => t.type === 'EXPENSE').forEach(t => {
                                cats[t.category] = (cats[t.category] || 0) + t.amount;
                            });
                            const total = Object.values(cats).reduce((a, b) => a + b, 0) || 1;
                            
                            return Object.entries(cats)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([cat, amount], i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <div className="w-24 text-slate-600 truncate">{cat}</div>
                                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div className="bg-slate-600 h-full rounded-full" style={{ width: `${(amount / total) * 100}%` }}></div>
                                        </div>
                                        <div className="w-16 text-right font-medium">{currencySymbol}{amount.toLocaleString()}</div>
                                    </div>
                                ));
                        })()}
                    </div>
                 </div>
             </div>
         </div>
      )}
      
      {activeTab === 'TRANSACTIONS' && (
         <div className="space-y-4">
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                <div className="flex flex-col md:flex-row gap-4 w-full">
                   {/* Date Range */}
                   <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300">
                      <div className="px-2 text-slate-400"><CalendarRange size={16} /></div>
                      <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={e => setDateRange({...dateRange, start: e.target.value})}
                        className="text-sm outline-none text-slate-600 w-32"
                        placeholder="Start Date"
                      />
                      <span className="text-slate-300">|</span>
                      <input 
                        type="date" 
                        value={dateRange.end}
                        onChange={e => setDateRange({...dateRange, end: e.target.value})}
                        className="text-sm outline-none text-slate-600 w-32"
                        placeholder="End Date"
                      />
                   </div>

                   {/* Category Filter */}
                   <div className="relative">
                      <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select 
                         value={categoryFilter}
                         onChange={(e) => setCategoryFilter(e.target.value)}
                         className="pl-9 pr-8 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white w-full md:w-auto"
                      >
                         <option value="ALL">All Categories</option>
                         <option value="Feed">Feed</option>
                         <option value="Medicine">Medicine</option>
                         <option value="Labor">Labor</option>
                         <option value="Utilities">Utilities</option>
                         <option value="Livestock Purchase">Livestock Purchase</option>
                         <option value="Equipment">Equipment</option>
                         <option value="Sales - Eggs">Sales - Eggs</option>
                         <option value="Sales - Meat">Sales - Meat</option>
                         <option value="Sales - Manure">Sales - Manure</option>
                         <option value="Transport">Transport</option>
                         <option value="Other">Other</option>
                      </select>
                   </div>

                   {/* Sort By */}
                   <div className="relative">
                      <ArrowUpDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select 
                         value={sortBy}
                         onChange={(e) => setSortBy(e.target.value as any)}
                         className="pl-9 pr-8 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white w-full md:w-auto"
                      >
                         <option value="DATE_DESC">Newest First</option>
                         <option value="DATE_ASC">Oldest First</option>
                         <option value="AMT_DESC">Highest Amount</option>
                         <option value="AMT_ASC">Lowest Amount</option>
                      </select>
                   </div>
                </div>

                <div className="flex gap-2">
                   <button 
                     onClick={handleExportCSV}
                     className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium shadow-sm"
                   >
                     <Download size={16} /> Export
                   </button>
                   <button 
                     onClick={handleOpenAddModal}
                     className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
                   >
                     <Plus size={16} /> Add Transaction
                   </button>
                </div>
             </div>

             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                         <th className="px-6 py-4">Date</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4">Category</th>
                         <th className="px-6 py-4">Description</th>
                         <th className="px-6 py-4 text-right">Tax</th>
                         <th className="px-6 py-4 text-right">Amount</th>
                         <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map(t => (
                           <tr key={t.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 text-slate-600 font-mono text-xs">{t.date}</td>
                              <td className="px-6 py-4">
                                 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700 border border-green-200">
                                    <CheckCircle2 size={10} /> Completed
                                 </span>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-slate-100 rounded-md border border-slate-200">
                                       {getCategoryIcon(t.category)}
                                    </div>
                                    <span className="font-medium text-slate-700">{t.category}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="text-slate-700">{t.description}</div>
                                 <div className="text-[10px] text-slate-400">
                                    {t.referenceId && t.referenceId.startsWith('ord-') ? (
                                        <span className="flex items-center gap-1"><FileText size={10}/> Order #{t.referenceId.split('-')[1] || t.referenceId}</span>
                                    ) : t.flockId ? (
                                        `Ref: ${flocks.find(f => f.id === t.flockId)?.name}`
                                    ) : 'General Ledger'}
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-right text-xs">
                                 {(t.vatAmount || 0) > 0 && (
                                     <div className="text-slate-500">VAT: {currencySymbol}{(t.vatAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                 )}
                                 {(t.whtAmount || 0) > 0 && (
                                     <div className="text-red-500">WHT: {currencySymbol}{(t.whtAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                 )}
                                 {(!t.vatAmount && !t.whtAmount) && <span className="text-slate-300">-</span>}
                              </td>
                              <td className={`px-6 py-4 text-right font-bold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                 {t.type === 'INCOME' ? '+' : '-'}{currencySymbol}{t.amount.toLocaleString()}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center justify-center gap-2">
                                    <button 
                                      onClick={() => handleEditTx(t)}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    >
                                       <Edit size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteTx(t.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))
                      ) : (
                        <tr>
                           <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                              No transactions found.
                           </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
         </div>
      )}

      {/* Other tabs remain unchanged in logic but need to be included in full file output if I were outputting the whole file, but I am outputting the whole file so... */}
      {activeTab === 'STATEMENTS' && renderStatements()}
      {activeTab === 'TAX' && renderTaxCompliance()}

      {/* Transaction Modal & Delete Confirmation - same as before */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="font-bold text-lg text-slate-900">
                  {editingTxId ? 'Edit Transaction' : 'Record Transaction'}
                </h3>
                <button onClick={() => setIsTxModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
             </div>
             <form onSubmit={handleTxSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                     <input 
                       type="date" 
                       value={txForm.date}
                       onChange={e => setTxForm({...txForm, date: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                     <select 
                       value={txForm.type}
                       onChange={e => setTxForm({...txForm, type: e.target.value as TransactionType})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                     >
                        <option value="EXPENSE">Expense</option>
                        <option value="INCOME">Income</option>
                     </select>
                   </div>
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                   <select 
                       value={txForm.category}
                       onChange={e => setTxForm({...txForm, category: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                   >
                      <option value="Feed">Feed</option>
                      <option value="Medicine">Medicine</option>
                      <option value="Labor">Labor</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Livestock Purchase">Livestock Purchase</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Sales - Eggs">Sales - Eggs</option>
                      <option value="Sales - Meat">Sales - Meat</option>
                      <option value="Sales - Manure">Sales - Manure</option>
                      <option value="Transport">Transport / Logistics</option>
                      <option value="Other">Other</option>
                   </select>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                   <label className="block text-sm font-bold text-slate-800 mb-2">Financial Breakdown</label>
                   
                   <div className="space-y-3">
                      <div>
                         <label className="block text-xs font-medium text-slate-500 mb-1">Subtotal (Net Amount)</label>
                         <input 
                           type="number"
                           min="0"
                           step="0.01" 
                           value={txForm.subTotal || ''}
                           onChange={e => setTxForm({...txForm, subTotal: Number(e.target.value)})}
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium"
                           placeholder="0.00"
                         />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                               VAT % <Percent size={10} />
                            </label>
                            <input 
                              type="number"
                              min="0"
                              max="100"
                              step="0.1" 
                              value={txForm.vatRate}
                              onChange={e => setTxForm({...txForm, vatRate: Number(e.target.value)})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                               WHT % <Percent size={10} />
                            </label>
                            <input 
                              type="number"
                              min="0"
                              max="100"
                              step="0.1" 
                              value={txForm.whtRate}
                              onChange={e => setTxForm({...txForm, whtRate: Number(e.target.value)})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                            />
                         </div>
                      </div>

                      {/* Calculated Display */}
                      <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
                         <div className="flex justify-between text-slate-600">
                            <span>VAT Amount ({txForm.vatRate}%):</span>
                            <span>{currencySymbol}{((Number(txForm.subTotal) || 0) * (Number(txForm.vatRate) || 0) / 100).toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between text-slate-600">
                            <span>WHT Amount ({txForm.whtRate}%):</span>
                            <span>-{currencySymbol}{((Number(txForm.subTotal) || 0) * (Number(txForm.whtRate) || 0) / 100).toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between font-bold text-slate-900 text-sm pt-1">
                            <span>Total Cash {txForm.type === 'INCOME' ? 'Received' : 'Paid'}:</span>
                            <span>
                                {currencySymbol}{((Number(txForm.subTotal) || 0) + 
                                   ((Number(txForm.subTotal) || 0) * (Number(txForm.vatRate) || 0) / 100) - 
                                   ((Number(txForm.subTotal) || 0) * (Number(txForm.whtRate) || 0) / 100)
                                  ).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </span>
                         </div>
                      </div>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Flock Allocation (Optional)</label>
                   <select 
                       value={txForm.flockId}
                       onChange={e => setTxForm({...txForm, flockId: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                   >
                      <option value="">-- General / Overhead --</option>
                      {flocks.map(f => (
                         <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                   </select>
                   <p className="text-xs text-slate-500 mt-1">Assigning to a flock enables accurate Cost per Bird/Egg analysis.</p>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                   <input 
                     type="text" 
                     value={txForm.description}
                     onChange={e => setTxForm({...txForm, description: e.target.value})}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                     placeholder="Details about transaction..."
                   />
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                   <button 
                     type="button" 
                     onClick={() => setIsTxModalOpen(false)}
                     className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2"
                   >
                     <Save size={18} /> {editingTxId ? 'Update Record' : 'Save Record'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
             <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
               <AlertTriangle className="text-red-600" size={24} />
             </div>
             <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Delete Transaction?</h3>
             <p className="text-center text-slate-500 mb-6">
               Are you sure you want to delete this record? This action cannot be undone and will affect your financial reports.
             </p>
             <div className="flex gap-3">
               <button
                 onClick={() => setDeleteConfirmationId(null)}
                 className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium transition-colors"
               >
                 Cancel
               </button>
               <button
                 onClick={() => {
                   onDeleteTransaction(deleteConfirmationId);
                   setDeleteConfirmationId(null);
                 }}
                 className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium transition-colors"
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

export default FinanceModule;