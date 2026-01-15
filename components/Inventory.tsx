import React, { useState, useMemo } from 'react';
import { InventoryItem, Flock, Transaction, InventoryCategory, BirdType, MaintenanceLog, UsageLog } from '../types';
import { 
  Search, 
  Plus, 
  Filter, 
  AlertTriangle, 
  Package, 
  Wheat, 
  Edit, 
  Trash2, 
  ShoppingCart, 
  Save, 
  X, 
  DollarSign, 
  Percent,
  Thermometer,
  Wrench,
  MoreHorizontal,
  Calendar,
  Clock,
  History,
  FileText,
  ClipboardList,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface InventoryProps {
  items: InventoryItem[];
  flocks: Flock[];
  onUpdateItem: (item: InventoryItem) => void;
  onAddItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onAddTransaction: (transaction: Transaction) => void;
  onUpdateFlock: (flock: Flock) => void;
}

const Inventory: React.FC<InventoryProps> = ({ 
  items, 
  flocks, 
  onUpdateItem, 
  onAddItem, 
  onDeleteItem, 
  onAddTransaction,
  onUpdateFlock 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | 'ALL'>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Equipment Management State
  const [managingItem, setManagingItem] = useState<InventoryItem | null>(null);
  const [activeManageTab, setActiveManageTab] = useState<'INFO' | 'MAINTENANCE' | 'USAGE'>('INFO');
  
  // Transaction Checkbox State
  const [recordExpense, setRecordExpense] = useState(true);

  const [maintForm, setMaintForm] = useState<Partial<MaintenanceLog>>({
    date: new Date().toISOString().split('T')[0],
    type: 'Preventive',
    description: '',
    cost: 0,
    performedBy: '',
    nextDueDate: ''
  });

  const [usageForm, setUsageForm] = useState<Partial<UsageLog>>({
    date: new Date().toISOString().split('T')[0],
    durationHours: 0,
    usedBy: '',
    notes: ''
  });

  const [newItemData, setNewItemData] = useState<Partial<InventoryItem>>({
    name: '',
    category: InventoryCategory.OTHER,
    quantity: 0,
    unit: 'units',
    minLevel: 0,
    costPerUnit: 0,
    location: '',
    notes: '',
    vatRate: 0,
    whtRate: 0,
    targetBirdType: undefined,
    serialNumber: '',
    model: '',
    warrantyExpiry: ''
  });

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, categoryFilter]);

  const lowStockItems = items.filter(i => i.quantity <= i.minLevel);

  const resetForm = () => {
    setNewItemData({
      name: '',
      category: InventoryCategory.OTHER,
      quantity: 0,
      unit: 'units',
      minLevel: 0,
      costPerUnit: 0,
      location: '',
      notes: '',
      vatRate: 0,
      whtRate: 0,
      targetBirdType: undefined,
      serialNumber: '',
      model: '',
      warrantyExpiry: ''
    });
    setEditingId(null);
    setRecordExpense(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setNewItemData({ ...item });
    setRecordExpense(true);
    setIsModalOpen(true);
  };

  // Calculate expense details for preview
  const expensePreview = useMemo(() => {
    const currentQty = Number(newItemData.quantity) || 0;
    const oldItem = editingId ? items.find(i => i.id === editingId) : null;
    const oldQty = oldItem ? oldItem.quantity : 0;
    const diff = currentQty - oldQty;
    const cost = Number(newItemData.costPerUnit) || 0;

    if (diff <= 0 || cost <= 0) return null;

    const subTotal = diff * cost;
    const vatRate = Number(newItemData.vatRate) || 0;
    const whtRate = Number(newItemData.whtRate) || 0;
    const vatAmount = subTotal * (vatRate / 100);
    const whtAmount = subTotal * (whtRate / 100);
    const totalAmount = subTotal + vatAmount - whtAmount;

    return { diff, subTotal, vatAmount, whtAmount, totalAmount };
  }, [newItemData.quantity, newItemData.costPerUnit, newItemData.vatRate, newItemData.whtRate, editingId, items]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item: InventoryItem = {
      id: editingId || `inv-${Date.now()}`,
      name: newItemData.name || 'New Item',
      category: newItemData.category || InventoryCategory.OTHER,
      quantity: Number(newItemData.quantity) || 0,
      unit: newItemData.unit || 'units',
      minLevel: Number(newItemData.minLevel) || 0,
      costPerUnit: Number(newItemData.costPerUnit) || 0,
      lastUpdated: new Date().toISOString().split('T')[0],
      location: newItemData.location,
      notes: newItemData.notes,
      vatRate: Number(newItemData.vatRate) || 0,
      whtRate: Number(newItemData.whtRate) || 0,
      targetBirdType: newItemData.targetBirdType,
      serialNumber: newItemData.serialNumber,
      model: newItemData.model,
      warrantyExpiry: newItemData.warrantyExpiry,
      // Preserve existing logs if editing
      maintenanceLogs: editingId ? items.find(i => i.id === editingId)?.maintenanceLogs : [],
      usageLogs: editingId ? items.find(i => i.id === editingId)?.usageLogs : [],
      nextMaintenanceDate: editingId ? items.find(i => i.id === editingId)?.nextMaintenanceDate : undefined
    };

    // --- Financial Integration Logic (Restock) ---
    if (recordExpense && expensePreview) {
        // Determine Transaction Category based on Inventory Category
        let txCategory = 'Other';
        if (item.category === InventoryCategory.FEED) txCategory = 'Feed';
        else if (item.category === InventoryCategory.MEDICINE) txCategory = 'Medicine';
        else if (item.category === InventoryCategory.EQUIPMENT) txCategory = 'Equipment';

        const transaction: Transaction = {
            id: `tx-inv-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'EXPENSE',
            category: txCategory,
            amount: expensePreview.totalAmount,
            subTotal: expensePreview.subTotal,
            vatAmount: expensePreview.vatAmount,
            whtAmount: expensePreview.whtAmount,
            description: `${editingId ? 'Restock' : 'Initial Purchase'}: ${item.name} (+${expensePreview.diff.toLocaleString()} ${item.unit})`,
            referenceId: item.id // Link to the inventory item ID
        };

        onAddTransaction(transaction);
    }

    if (editingId) {
      onUpdateItem(item);
    } else {
      onAddItem(item);
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
        onDeleteItem(deleteConfirmId);
        setDeleteConfirmId(null);
    }
  };

  // --- Equipment Management Handlers ---

  const handleSaveMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingItem) return;

    const newLog: MaintenanceLog = {
      id: `maint-${Date.now()}`,
      date: maintForm.date || new Date().toISOString().split('T')[0],
      type: maintForm.type as any,
      description: maintForm.description || '',
      cost: Number(maintForm.cost) || 0,
      performedBy: maintForm.performedBy || '',
      nextDueDate: maintForm.nextDueDate
    };

    const updatedItem = {
      ...managingItem,
      maintenanceLogs: [newLog, ...(managingItem.maintenanceLogs || [])],
      nextMaintenanceDate: maintForm.nextDueDate || managingItem.nextMaintenanceDate
    };

    onUpdateItem(updatedItem);
    setManagingItem(updatedItem);

    // Financial Record for Maintenance
    if (newLog.cost > 0) {
      if(window.confirm(`Record an expense transaction for this maintenance cost ($${newLog.cost})?`)) {
        onAddTransaction({
          id: `tx-maint-${newLog.id}`,
          date: newLog.date,
          type: 'EXPENSE',
          category: 'Equipment Maintenance',
          amount: newLog.cost,
          description: `Maintenance: ${managingItem.name} - ${newLog.type}`,
          subTotal: newLog.cost // Assuming net for simple maintenance
        });
      }
    }

    setMaintForm({
      date: new Date().toISOString().split('T')[0],
      type: 'Preventive',
      description: '',
      cost: 0,
      performedBy: '',
      nextDueDate: ''
    });
  };

  const handleSaveUsage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingItem) return;

    const newLog: UsageLog = {
      id: `use-${Date.now()}`,
      date: usageForm.date || new Date().toISOString().split('T')[0],
      durationHours: Number(usageForm.durationHours) || 0,
      usedBy: usageForm.usedBy || '',
      notes: usageForm.notes
    };

    const updatedItem = {
      ...managingItem,
      usageLogs: [newLog, ...(managingItem.usageLogs || [])]
    };

    onUpdateItem(updatedItem);
    setManagingItem(updatedItem);

    setUsageForm({
      date: new Date().toISOString().split('T')[0],
      durationHours: 0,
      usedBy: '',
      notes: ''
    });
  };

  const getCategoryIcon = (cat: InventoryCategory) => {
    switch(cat) {
        case InventoryCategory.FEED: return <Wheat size={18} className="text-orange-500" />;
        case InventoryCategory.MEDICINE: return <Thermometer size={18} className="text-blue-500" />;
        case InventoryCategory.EQUIPMENT: return <Wrench size={18} className="text-slate-500" />;
        default: return <Package size={18} className="text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory & Feed</h1>
            <p className="text-slate-500 text-sm mt-1">Track stock levels, reorder points, and equipment maintenance.</p>
         </div>
         <button 
           onClick={handleOpenAdd}
           className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
         >
           <Plus size={16} /> Add Item
         </button>
       </div>

       {/* Stats Grid */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex justify-between items-start">
                   <div>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Value</p>
                       <h3 className="text-2xl font-bold text-slate-900 mt-1">
                          ${items.reduce((acc, i) => acc + (i.quantity * i.costPerUnit), 0).toLocaleString()}
                       </h3>
                   </div>
                   <div className="p-2.5 bg-green-50 text-green-600 rounded-lg">
                       <DollarSign size={22} />
                   </div>
               </div>
           </div>
           
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex justify-between items-start">
                   <div>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock</p>
                       <h3 className="text-2xl font-bold text-slate-900 mt-1">{lowStockItems.length} Items</h3>
                   </div>
                   <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg">
                       <AlertTriangle size={22} />
                   </div>
               </div>
               {lowStockItems.length > 0 && (
                   <p className="text-xs text-orange-600 mt-2 font-medium">Restock needed soon.</p>
               )}
           </div>

           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex justify-between items-start">
                   <div>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Feed Stock</p>
                       <h3 className="text-2xl font-bold text-slate-900 mt-1">
                          {items.filter(i => i.category === InventoryCategory.FEED).reduce((acc, i) => acc + i.quantity, 0).toLocaleString()} <span className="text-sm text-slate-400 font-normal">units</span>
                       </h3>
                   </div>
                   <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-lg">
                       <Wheat size={22} />
                   </div>
               </div>
           </div>
       </div>

       {/* Toolbar */}
       <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
           <div className="relative flex-1 w-full">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Search inventory..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
               />
           </div>
           <div className="relative w-full md:w-auto">
               <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <select 
                 value={categoryFilter}
                 onChange={(e) => setCategoryFilter(e.target.value as any)}
                 className="w-full md:w-48 pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white appearance-none cursor-pointer"
               >
                   <option value="ALL">All Categories</option>
                   <option value={InventoryCategory.FEED}>Feed</option>
                   <option value={InventoryCategory.MEDICINE}>Medicine</option>
                   <option value={InventoryCategory.EQUIPMENT}>Equipment</option>
                   <option value={InventoryCategory.OTHER}>Other</option>
               </select>
           </div>
       </div>

       {/* Inventory Table */}
       <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                     <tr>
                        <th className="px-6 py-4">Item Name</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Stock Level</th>
                        <th className="px-6 py-4">Unit Cost</th>
                        <th className="px-6 py-4">Total Value</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredItems.length > 0 ? filteredItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                           <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{item.name}</div>
                              {item.category === InventoryCategory.EQUIPMENT && (
                                  <div className="flex gap-2 mt-1">
                                      {item.model && <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Model: {item.model}</span>}
                                      {item.nextMaintenanceDate && (
                                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                              <Clock size={10} /> Due: {item.nextMaintenanceDate}
                                          </span>
                                      )}
                                  </div>
                              )}
                              {item.targetBirdType && (
                                  <div className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                      For: {item.targetBirdType}
                                  </div>
                              )}
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 {getCategoryIcon(item.category)}
                                 <span className="text-slate-700">{item.category}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                  <span className={`font-bold ${item.quantity <= item.minLevel ? 'text-red-600' : 'text-slate-700'}`}>
                                      {item.quantity.toLocaleString()} {item.unit}
                                  </span>
                                  {item.quantity <= item.minLevel && <AlertTriangle size={14} className="text-red-500" />}
                              </div>
                              <div className="text-xs text-slate-400">Min: {item.minLevel}</div>
                           </td>
                           <td className="px-6 py-4 text-slate-600">
                               ${item.costPerUnit.toFixed(2)}
                           </td>
                           <td className="px-6 py-4 font-medium text-slate-800">
                               ${(item.quantity * item.costPerUnit).toLocaleString()}
                           </td>
                           <td className="px-6 py-4 text-slate-500">
                               {item.location || '-'}
                           </td>
                           <td className="px-6 py-4 text-right">
                               <div className="flex justify-end gap-2 items-center">
                                   {item.category === InventoryCategory.EQUIPMENT && (
                                       <button 
                                         onClick={() => {
                                             setManagingItem(item);
                                             setActiveManageTab('INFO');
                                         }}
                                         className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors mr-1"
                                       >
                                           Manage
                                       </button>
                                   )}
                                   <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button 
                                         onClick={() => handleOpenEdit(item)}
                                         className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                       >
                                          <Edit size={16} />
                                       </button>
                                       <button 
                                         onClick={() => setDeleteConfirmId(item.id)}
                                         className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                   </div>
                               </div>
                           </td>
                        </tr>
                     )) : (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                No inventory items found.
                            </td>
                        </tr>
                     )}
                  </tbody>
               </table>
           </div>
       </div>

       {/* Add/Edit Modal */}
       {isModalOpen && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
               <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                  <h3 className="font-bold text-lg text-slate-900">{editingId ? 'Edit Item' : 'Add New Item'}</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
               </div>
               
               <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Item Name <span className="text-red-500">*</span></label>
                     <input 
                       required
                       type="text" 
                       value={newItemData.name}
                       onChange={e => setNewItemData({...newItemData, name: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                     />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                         <select 
                           value={newItemData.category}
                           onChange={e => setNewItemData({...newItemData, category: e.target.value as any})}
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                         >
                            <option value={InventoryCategory.FEED}>Feed</option>
                            <option value={InventoryCategory.MEDICINE}>Medicine</option>
                            <option value={InventoryCategory.EQUIPMENT}>Equipment</option>
                            <option value={InventoryCategory.OTHER}>Other</option>
                         </select>
                      </div>
                      
                      {newItemData.category === InventoryCategory.FEED && (
                          <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Target Bird Type</label>
                             <select 
                               value={newItemData.targetBirdType || ''}
                               onChange={e => setNewItemData({...newItemData, targetBirdType: e.target.value as BirdType})}
                               className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                             >
                                <option value="">Any</option>
                                <option value={BirdType.BROILER}>Broiler</option>
                                <option value={BirdType.LAYER}>Layer</option>
                                <option value={BirdType.BREEDER}>Breeder</option>
                             </select>
                          </div>
                      )}
                  </div>

                  {/* Equipment Specific Fields */}
                  {newItemData.category === InventoryCategory.EQUIPMENT && (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                          <div className="col-span-2 text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                              <Wrench size={12} /> Equipment Details
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Model / Brand</label>
                              <input 
                                type="text"
                                value={newItemData.model || ''}
                                onChange={e => setNewItemData({...newItemData, model: e.target.value})}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Serial Number</label>
                              <input 
                                type="text"
                                value={newItemData.serialNumber || ''}
                                onChange={e => setNewItemData({...newItemData, serialNumber: e.target.value})}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                              />
                          </div>
                          <div className="col-span-2">
                              <label className="block text-xs font-medium text-slate-700 mb-1">Warranty Expiration</label>
                              <input 
                                type="date"
                                value={newItemData.warrantyExpiry || ''}
                                onChange={e => setNewItemData({...newItemData, warrantyExpiry: e.target.value})}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                              />
                          </div>
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                         <input 
                           type="number"
                           min="0"
                           step="0.01" 
                           value={newItemData.quantity}
                           onChange={e => setNewItemData({...newItemData, quantity: Number(e.target.value)})}
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                         />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                         <input 
                           type="text"
                           list="units"
                           value={newItemData.unit}
                           onChange={e => setNewItemData({...newItemData, unit: e.target.value})}
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                           placeholder="kg, bags, pcs..."
                         />
                         <datalist id="units">
                             <option value="kg" />
                             <option value="liters" />
                             <option value="bags" />
                             <option value="pcs" />
                             <option value="boxes" />
                         </datalist>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Min Level (Alert)</label>
                         <input 
                           type="number"
                           min="0" 
                           value={newItemData.minLevel}
                           onChange={e => setNewItemData({...newItemData, minLevel: Number(e.target.value)})}
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                         />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Cost per Unit</label>
                         <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                            <input 
                              type="number"
                              min="0"
                              step="0.01" 
                              value={newItemData.costPerUnit}
                              onChange={e => setNewItemData({...newItemData, costPerUnit: Number(e.target.value)})}
                              className="w-full pl-6 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                            />
                         </div>
                      </div>
                  </div>

                  {/* Tax Config */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                      <div className="col-span-2 text-xs font-bold text-slate-500 uppercase">Default Tax Rates</div>
                      <div>
                         <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                             VAT % <Percent size={10} />
                         </label>
                         <input 
                           type="number"
                           min="0"
                           max="100"
                           step="0.1" 
                           value={newItemData.vatRate}
                           onChange={e => setNewItemData({...newItemData, vatRate: Number(e.target.value)})}
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                             WHT % <Percent size={10} />
                         </label>
                         <input 
                           type="number"
                           min="0"
                           max="100"
                           step="0.1" 
                           value={newItemData.whtRate}
                           onChange={e => setNewItemData({...newItemData, whtRate: Number(e.target.value)})}
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                         />
                      </div>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Location / Shelf</label>
                     <input 
                       type="text" 
                       value={newItemData.location}
                       onChange={e => setNewItemData({...newItemData, location: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                     <textarea 
                       rows={2}
                       value={newItemData.notes}
                       onChange={e => setNewItemData({...newItemData, notes: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                     />
                  </div>

                  {/* Expense Preview Panel */}
                  {expensePreview && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-2">
                        <div className="flex justify-between items-center mb-3">
                            <label className="flex items-center gap-2 text-sm font-bold text-green-900 cursor-pointer select-none">
                                <input 
                                type="checkbox" 
                                checked={recordExpense}
                                onChange={e => setRecordExpense(e.target.checked)}
                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer"
                                />
                                Record Expense Transaction
                            </label>
                            <span className="text-xs font-bold text-green-800 bg-green-200/50 px-2 py-1 rounded border border-green-200">
                                Total: ${expensePreview.totalAmount.toFixed(2)}
                            </span>
                        </div>
                        
                        {recordExpense && (
                            <div className="text-xs space-y-1 pl-6 text-green-800 opacity-90 border-l-2 border-green-300">
                                <div className="flex justify-between">
                                    <span>Added Stock Cost:</span>
                                    <span>${expensePreview.subTotal.toFixed(2)}</span>
                                </div>
                                {expensePreview.vatAmount > 0 && (
                                    <div className="flex justify-between">
                                        <span>VAT:</span>
                                        <span>+${expensePreview.vatAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {expensePreview.whtAmount > 0 && (
                                    <div className="flex justify-between">
                                        <span>WHT:</span>
                                        <span>-${expensePreview.whtAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <p className="mt-1 text-[10px] italic opacity-75">
                                    A "Restock" expense will be added to the Finance module.
                                </p>
                            </div>
                        )}
                    </div>
                  )}

                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
                     <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2">
                       <Save size={18} /> {editingId ? 'Update Item' : 'Save Item'}
                     </button>
                  </div>
               </form>
            </div>
         </div>
       )}

       {/* Equipment Manager Modal */}
       {managingItem && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
               <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl sticky top-0 z-10">
                  <div>
                      <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                          <Wrench size={20} className="text-slate-500" />
                          Equipment Manager
                      </h3>
                      <p className="text-sm text-slate-500">{managingItem.name}</p>
                  </div>
                  <button onClick={() => setManagingItem(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
                    <X size={20} />
                  </button>
               </div>

               {/* Tabs */}
               <div className="flex border-b border-slate-200 px-6">
                   <button 
                     onClick={() => setActiveManageTab('INFO')}
                     className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeManageTab === 'INFO' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                   >
                       Info
                   </button>
                   <button 
                     onClick={() => setActiveManageTab('MAINTENANCE')}
                     className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeManageTab === 'MAINTENANCE' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                   >
                       Maintenance Logs
                   </button>
                   <button 
                     onClick={() => setActiveManageTab('USAGE')}
                     className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeManageTab === 'USAGE' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                   >
                       Usage History
                   </button>
               </div>

               <div className="p-6 flex-1 overflow-y-auto">
                   {activeManageTab === 'INFO' && (
                       <div className="space-y-6">
                           <div className="grid grid-cols-2 gap-6">
                               <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                   <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Serial Number</span>
                                   <span className="font-mono text-sm text-slate-800">{managingItem.serialNumber || 'N/A'}</span>
                               </div>
                               <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                   <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Model</span>
                                   <span className="text-sm font-medium text-slate-800">{managingItem.model || 'N/A'}</span>
                               </div>
                               <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                   <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Warranty Expiry</span>
                                   <span className={`text-sm font-medium ${managingItem.warrantyExpiry && new Date(managingItem.warrantyExpiry) < new Date() ? 'text-red-600' : 'text-slate-800'}`}>
                                       {managingItem.warrantyExpiry || 'N/A'}
                                   </span>
                               </div>
                               <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                   <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Next Maintenance</span>
                                   <span className={`text-sm font-bold flex items-center gap-2 ${managingItem.nextMaintenanceDate && new Date(managingItem.nextMaintenanceDate) <= new Date() ? 'text-orange-600' : 'text-blue-600'}`}>
                                       {managingItem.nextMaintenanceDate || 'Not Scheduled'}
                                       {managingItem.nextMaintenanceDate && new Date(managingItem.nextMaintenanceDate) <= new Date() && <AlertCircle size={14} />}
                                   </span>
                               </div>
                           </div>
                           <div className="flex justify-end">
                               <button 
                                 onClick={() => {setManagingItem(null); handleOpenEdit(managingItem);}}
                                 className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                               >
                                   <Edit size={14} /> Edit Details
                               </button>
                           </div>
                       </div>
                   )}

                   {activeManageTab === 'MAINTENANCE' && (
                       <div className="space-y-6">
                           {/* Add Log Form */}
                           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                               <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                   <Plus size={14} /> Record Maintenance
                               </h4>
                               <form onSubmit={handleSaveMaintenance} className="grid grid-cols-2 gap-3">
                                   <div>
                                       <label className="block text-xs text-slate-500 mb-1">Date</label>
                                       <input 
                                         type="date"
                                         required
                                         value={maintForm.date}
                                         onChange={e => setMaintForm({...maintForm, date: e.target.value})}
                                         className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none focus:ring-1 focus:ring-primary-500"
                                       />
                                   </div>
                                   <div>
                                       <label className="block text-xs text-slate-500 mb-1">Type</label>
                                       <select 
                                         value={maintForm.type}
                                         onChange={e => setMaintForm({...maintForm, type: e.target.value as any})}
                                         className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                                       >
                                           <option>Preventive</option>
                                           <option>Repair</option>
                                           <option>Inspection</option>
                                       </select>
                                   </div>
                                   <div className="col-span-2">
                                       <label className="block text-xs text-slate-500 mb-1">Description</label>
                                       <input 
                                         type="text"
                                         required
                                         value={maintForm.description}
                                         onChange={e => setMaintForm({...maintForm, description: e.target.value})}
                                         className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none focus:ring-1 focus:ring-primary-500"
                                         placeholder="What was done?"
                                       />
                                   </div>
                                   <div>
                                       <label className="block text-xs text-slate-500 mb-1">Cost ($)</label>
                                       <input 
                                         type="number"
                                         min="0"
                                         step="0.01"
                                         value={maintForm.cost}
                                         onChange={e => setMaintForm({...maintForm, cost: Number(e.target.value)})}
                                         className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none focus:ring-1 focus:ring-primary-500"
                                       />
                                   </div>
                                   <div>
                                       <label className="block text-xs text-slate-500 mb-1">Next Due Date</label>
                                       <input 
                                         type="date"
                                         value={maintForm.nextDueDate}
                                         onChange={e => setMaintForm({...maintForm, nextDueDate: e.target.value})}
                                         className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none focus:ring-1 focus:ring-primary-500"
                                       />
                                   </div>
                                   <div className="col-span-2 flex justify-end">
                                       <button type="submit" className="bg-primary-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-primary-700 transition-colors">
                                           Save Log
                                       </button>
                                   </div>
                               </form>
                           </div>

                           {/* History List */}
                           <div className="space-y-3">
                               <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Log History</h4>
                               {managingItem.maintenanceLogs && managingItem.maintenanceLogs.length > 0 ? (
                                   managingItem.maintenanceLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                                       <div key={log.id} className="bg-white border border-slate-100 p-3 rounded-lg flex justify-between items-start hover:shadow-sm transition-shadow">
                                           <div>
                                               <div className="flex items-center gap-2 mb-1">
                                                   <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                                       log.type === 'Repair' ? 'bg-red-50 text-red-600 border-red-100' :
                                                       log.type === 'Preventive' ? 'bg-green-50 text-green-600 border-green-100' :
                                                       'bg-blue-50 text-blue-600 border-blue-100'
                                                   }`}>{log.type}</span>
                                                   <span className="text-xs text-slate-400">{log.date}</span>
                                               </div>
                                               <p className="text-sm text-slate-700 font-medium">{log.description}</p>
                                           </div>
                                           <div className="text-right">
                                               <p className="text-sm font-bold text-slate-900">${log.cost.toLocaleString()}</p>
                                               {log.nextDueDate && <p className="text-[10px] text-slate-400">Next: {log.nextDueDate}</p>}
                                           </div>
                                       </div>
                                   ))
                               ) : (
                                   <div className="text-center py-4 text-slate-400 text-sm italic">No maintenance history.</div>
                               )}
                           </div>
                       </div>
                   )}

                   {activeManageTab === 'USAGE' && (
                       <div className="space-y-6">
                           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                               <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                   <Clock size={14} /> Log Usage
                               </h4>
                               <form onSubmit={handleSaveUsage} className="grid grid-cols-2 gap-3">
                                   <div>
                                       <label className="block text-xs text-slate-500 mb-1">Date</label>
                                       <input 
                                         type="date"
                                         required
                                         value={usageForm.date}
                                         onChange={e => setUsageForm({...usageForm, date: e.target.value})}
                                         className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none focus:ring-1 focus:ring-primary-500"
                                       />
                                   </div>
                                   <div>
                                       <label className="block text-xs text-slate-500 mb-1">Duration (Hours)</label>
                                       <input 
                                         type="number"
                                         min="0"
                                         step="0.5"
                                         required
                                         value={usageForm.durationHours}
                                         onChange={e => setUsageForm({...usageForm, durationHours: Number(e.target.value)})}
                                         className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none focus:ring-1 focus:ring-primary-500"
                                       />
                                   </div>
                                   <div className="col-span-2">
                                       <label className="block text-xs text-slate-500 mb-1">Operator / User</label>
                                       <input 
                                         type="text"
                                         required
                                         value={usageForm.usedBy}
                                         onChange={e => setUsageForm({...usageForm, usedBy: e.target.value})}
                                         className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none focus:ring-1 focus:ring-primary-500"
                                         placeholder="Employee Name"
                                       />
                                   </div>
                                   <div className="col-span-2 flex justify-end">
                                       <button type="submit" className="bg-primary-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-primary-700 transition-colors">
                                           Add Log
                                       </button>
                                   </div>
                               </form>
                           </div>

                           <div className="space-y-3">
                               <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Usage History</h4>
                               {managingItem.usageLogs && managingItem.usageLogs.length > 0 ? (
                                   managingItem.usageLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                                       <div key={log.id} className="bg-white border border-slate-100 p-3 rounded-lg flex justify-between items-center hover:shadow-sm transition-shadow">
                                           <div className="flex items-center gap-3">
                                               <div className="bg-slate-100 p-2 rounded text-slate-500">
                                                   <History size={16} />
                                               </div>
                                               <div>
                                                   <p className="text-sm font-medium text-slate-800">{log.usedBy}</p>
                                                   <p className="text-xs text-slate-400">{log.date}</p>
                                               </div>
                                           </div>
                                           <span className="text-sm font-bold text-slate-700">{log.durationHours} hrs</span>
                                       </div>
                                   ))
                               ) : (
                                   <div className="text-center py-4 text-slate-400 text-sm italic">No usage logged.</div>
                               )}
                           </div>
                       </div>
                   )}
               </div>
            </div>
         </div>
       )}

       {/* Delete Confirm */}
       {deleteConfirmId && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
               <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                 <Trash2 size={24} />
               </div>
               <h3 className="font-bold text-lg text-slate-900 mb-2">Delete Item?</h3>
               <p className="text-slate-500 text-sm mb-6">
                  Are you sure you want to delete this inventory item? History will be preserved in logs.
               </p>
               <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium"
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

export default Inventory;