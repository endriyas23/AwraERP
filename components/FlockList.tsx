import React, { useState } from 'react';
import { Flock, FlockStatus, BirdType, ProductionStage, Transaction } from '../types';
import { ArrowRight, Plus, Activity, Scale, X, Check, Trash2, AlertTriangle, DollarSign, Egg, Percent } from 'lucide-react';

interface FlockListProps {
  flocks: Flock[];
  onSelectFlock: (id: string, tab?: 'OVERVIEW' | 'LOGS' | 'AI' | 'EGG_PROD') => void;
  onAddFlock: (flock: Flock) => void;
  onDeleteFlock: (id: string) => void;
  onAddTransaction: (transaction: Transaction) => void;
}

const FlockList: React.FC<FlockListProps> = ({ flocks, onSelectFlock, onAddFlock, onDeleteFlock, onAddTransaction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [flockToDelete, setFlockToDelete] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Flock>>({
    name: '',
    type: BirdType.BROILER,
    breed: '',
    house: '',
    startDate: new Date().toISOString().split('T')[0],
    initialCount: 0,
    initialAgeDays: 1,
    initialCost: 0,
    vatRate: 0,
    whtRate: 0,
    source: '',
    productionStage: 'Starter'
  });

  const getStatusColor = (status: FlockStatus) => {
    switch (status) {
      case FlockStatus.ACTIVE: return 'bg-green-100 text-green-700 border-green-200';
      case FlockStatus.QUARANTINE: return 'bg-red-100 text-red-700 border-red-200';
      case FlockStatus.HARVESTED: return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getBirdIcon = (type: BirdType) => {
     return type === BirdType.LAYER ? '🥚' : '🍗';
  };

  // Helper to calculate age in days based on start date
  const getFlockAge = (flock: Flock) => {
    const start = new Date(flock.startDate);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - start.getTime();
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, days) + (flock.initialAgeDays || 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'initialCount' || name === 'initialAgeDays' || name === 'initialCost' || name === 'vatRate' || name === 'whtRate') ? Number(value) : value
    }));

    // Auto-update production stage options if type changes
    if (name === 'type') {
      const newType = value as BirdType;
      setFormData(prev => ({
        ...prev,
        type: newType,
        productionStage: newType === BirdType.BROILER ? 'Starter' : 'Chick'
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicitly capture numerical values
    const startCount = Number(formData.initialCount) || 0;
    const acquisitionCost = Number(formData.initialCost) || 0;

    const newFlock: Flock = {
      id: `f-${Date.now()}`, // Simple ID generation
      name: formData.name || 'New Flock',
      batchId: `B-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, // Auto-generate Batch ID
      type: formData.type as BirdType,
      breed: formData.breed || 'Unknown',
      house: formData.house || 'Main House',
      startDate: formData.startDate || new Date().toISOString(),
      initialCount: startCount,
      initialCost: acquisitionCost,
      vatRate: formData.vatRate || 0,
      whtRate: formData.whtRate || 0,
      currentCount: startCount, // Ensures currentCount equals initialCount at creation
      status: FlockStatus.ACTIVE,
      source: formData.source,
      initialAgeDays: formData.initialAgeDays,
      productionStage: formData.productionStage as ProductionStage,
      logs: []
    };
    
    onAddFlock(newFlock);

    // Financial Integration: Create Expense Transaction for Flock Acquisition
    if (acquisitionCost > 0) {
        const subTotal = acquisitionCost;
        const vatAmount = subTotal * ((newFlock.vatRate || 0) / 100);
        const whtAmount = subTotal * ((newFlock.whtRate || 0) / 100);
        const totalAmount = subTotal + vatAmount - whtAmount;

        // Automatically record the transaction
        const transaction: Transaction = {
            id: `tx-flock-init-${newFlock.id}`,
            date: newFlock.startDate,
            type: 'EXPENSE',
            category: 'Livestock Purchase',
            amount: totalAmount,
            subTotal: subTotal,
            vatAmount: vatAmount,
            whtAmount: whtAmount,
            description: `Initial Acquisition: ${newFlock.name} (${newFlock.initialCount} birds)`,
            flockId: newFlock.id,
            referenceId: newFlock.batchId
        };
        onAddTransaction(transaction);
    }

    setIsModalOpen(false);
    // Reset form
    setFormData({
      name: '',
      type: BirdType.BROILER,
      breed: '',
      house: '',
      startDate: new Date().toISOString().split('T')[0],
      initialCount: 0,
      initialAgeDays: 1,
      initialCost: 0,
      vatRate: 0,
      whtRate: 0,
      source: '',
      productionStage: 'Starter'
    });
  };

  // Calculate financials for preview
  const subTotal = formData.initialCost || 0;
  const vatAmount = subTotal * ((formData.vatRate || 0) / 100);
  const whtAmount = subTotal * ((formData.whtRate || 0) / 100);
  const totalPayable = subTotal + vatAmount - whtAmount;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Flock Management</h1>
           <p className="text-slate-500 text-sm mt-1">Manage your active houses, monitor growth, and track biological assets.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
        >
          <Plus size={16} />
          New Flock
        </button>
      </div>

      {/* Flock Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flocks.map(flock => (
          <div 
            key={flock.id} 
            onClick={() => onSelectFlock(flock.id)}
            className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:border-primary-400 hover:shadow-md transition-all group relative overflow-hidden flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <span className="text-6xl">{getBirdIcon(flock.type)}</span>
            </div>

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(flock.status)}`}>
                  {flock.status}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">{flock.name}</h3>
                <p className="text-sm text-slate-500">
                   {flock.breed} • <span className="font-mono text-xs bg-slate-100 px-1 rounded">{flock.batchId}</span>
                </p>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFlockToDelete(flock.id);
                }}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Delete Flock"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
               <div className="bg-slate-50 p-2 rounded-lg">
                 <div className="flex items-center gap-1 text-slate-500 text-xs mb-1">
                   <Activity size={12} /> Age
                 </div>
                 <div className="font-semibold text-slate-800">{getFlockAge(flock)} Days</div>
               </div>
               <div className="bg-slate-50 p-2 rounded-lg">
                 <div className="flex items-center gap-1 text-slate-500 text-xs mb-1">
                   <Scale size={12} /> Avg Weight
                 </div>
                 <div className="font-semibold text-slate-800">
                    {flock.logs.length > 0 ? `${flock.logs[flock.logs.length - 1].avgWeightG}g` : 'N/A'}
                 </div>
               </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 relative z-10">
               <div className="flex items-center justify-between">
                  <div>
                      <div className="text-sm font-medium text-slate-900">{flock.currentCount.toLocaleString()}</div>
                      <div className="text-xs text-slate-500">Live Birds • {flock.productionStage || 'N/A'}</div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Specific Link for Layers */}
                    {flock.type === BirdType.LAYER && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFlock(flock.id, 'EGG_PROD');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Egg size={14} /> Egg Prod.
                      </button>
                    )}
                    
                    <button className="flex items-center text-primary-600 text-sm font-medium group-hover:translate-x-1 transition-transform pl-2">
                      Manage <ArrowRight size={16} className="ml-1" />
                    </button>
                  </div>
               </div>
            </div>
          </div>
        ))}

        {/* Add New Placeholder Card */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center text-slate-400 hover:border-primary-300 hover:text-primary-600 hover:bg-slate-50 transition-all min-h-[240px]"
        >
           <div className="bg-white p-3 rounded-full shadow-sm mb-3">
             <Plus size={24} />
           </div>
           <span className="font-medium">Register New Batch</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {flockToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
             <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
               <AlertTriangle className="text-red-600" size={24} />
             </div>
             <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Delete Flock?</h3>
             <p className="text-center text-slate-500 mb-6">
               Are you sure you want to delete this flock? This action cannot be undone and all associated logs will be lost.
             </p>
             <div className="flex gap-3">
               <button
                 onClick={() => setFlockToDelete(null)}
                 className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium transition-colors"
               >
                 Cancel
               </button>
               <button
                 onClick={() => {
                   onDeleteFlock(flockToDelete);
                   setFlockToDelete(null);
                 }}
                 className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium transition-colors"
               >
                 Delete Flock
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Add New Flock Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                 <h2 className="text-xl font-bold text-slate-900">Register New Flock</h2>
                 <p className="text-sm text-slate-500">Setup a new batch for tracking.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Section 1: Identification */}
              <div className="space-y-4">
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                   <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">1</span>
                   Identification & Location
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Flock Name / Label <span className="text-red-500">*</span></label>
                      <input 
                        required
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. House A - Broilers"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      />
                    </div>
                    {/* Batch Number input removed */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Housing Location <span className="text-red-500">*</span></label>
                      <input 
                        required
                        type="text" 
                        name="house"
                        value={formData.house}
                        onChange={handleInputChange}
                        placeholder="e.g. House 3"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      />
                    </div>
                 </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              {/* Section 2: Biological Details */}
              <div className="space-y-4">
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                   <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">2</span>
                   Biological Details
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Bird Type <span className="text-red-500">*</span></label>
                      <select 
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white"
                      >
                        <option value={BirdType.BROILER}>Broiler (Meat)</option>
                        <option value={BirdType.LAYER}>Layer (Eggs)</option>
                        <option value={BirdType.BREEDER}>Breeder</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Production Stage</label>
                      <select 
                        name="productionStage"
                        value={formData.productionStage}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white"
                      >
                         {formData.type === BirdType.BROILER ? (
                           <>
                             <option value="Starter">Starter (0-10 days)</option>
                             <option value="Grower">Grower (11-25 days)</option>
                             <option value="Finisher">Finisher (26+ days)</option>
                           </>
                         ) : (
                           <>
                             <option value="Chick">Chick (0-8 weeks)</option>
                             <option value="Pullet">Pullet (9-18 weeks)</option>
                             <option value="Layer">Layer (19+ weeks)</option>
                           </>
                         )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Breed</label>
                      <input 
                        type="text" 
                        name="breed"
                        value={formData.breed}
                        onChange={handleInputChange}
                        placeholder="e.g. Cobb 500, Ross 308"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Source / Hatchery</label>
                      <input 
                        type="text" 
                        name="source"
                        value={formData.source}
                        onChange={handleInputChange}
                        placeholder="e.g. Aviagen, Local Hatchery"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      />
                    </div>
                 </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              {/* Section 3: Arrival, Count & Financials */}
              <div className="space-y-4">
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                   <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">3</span>
                   Arrival, Count & Financials
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date of Arrival <span className="text-red-500">*</span></label>
                      <input 
                        required
                        type="date" 
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Initial Age (Days) <span className="text-red-500">*</span></label>
                      <input 
                        required
                        type="number" 
                        min="0"
                        name="initialAgeDays"
                        value={formData.initialAgeDays}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Batch Size (Birds) <span className="text-red-500">*</span></label>
                      <input 
                        required
                        type="number"
                        min="1" 
                        name="initialCount"
                        value={formData.initialCount}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      />
                    </div>
                 </div>

                 {/* Financial Details (Cost + Tax) */}
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <DollarSign size={16} /> Acquisition Cost
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Base Cost</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-slate-400 text-xs font-bold">$</span>
                            </div>
                            <input 
                              type="number"
                              min="0"
                              step="0.01" 
                              name="initialCost"
                              value={formData.initialCost}
                              onChange={handleInputChange}
                              className="w-full pl-7 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">VAT <Percent size={10} /></label>
                          <input 
                            type="number"
                            min="0"
                            step="0.1" 
                            name="vatRate"
                            value={formData.vatRate}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">WHT <Percent size={10} /></label>
                          <input 
                            type="number"
                            min="0"
                            step="0.1" 
                            name="whtRate"
                            value={formData.whtRate}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                            placeholder="0"
                          />
                        </div>
                    </div>
                    
                    {(vatAmount > 0 || whtAmount > 0) && (
                        <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-1">
                            <div className="flex justify-between text-slate-600">
                                <span>VAT Amount:</span>
                                <span>+${vatAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>WHT Amount:</span>
                                <span>-${whtAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-900 pt-1">
                                <span>Total Payable:</span>
                                <span>${totalPayable.toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                 </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                 <button 
                   type="button"
                   onClick={() => {
                      setIsModalOpen(false);
                   }}
                   className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                 >
                   Cancel
                 </button>
                 <button 
                   type="submit"
                   className="px-5 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm flex items-center gap-2 transition-all bg-primary-600 hover:bg-primary-700 hover:shadow-md"
                 >
                   <Check size={18} />
                   Create Flock
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlockList;