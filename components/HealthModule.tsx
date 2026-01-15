import React, { useState, useMemo } from 'react';
import { Flock, FlockStatus, InventoryItem, MedicalRecord, InventoryCategory, AnalysisResult } from '../types';
import { 
  HeartPulse, 
  Plus, 
  Search, 
  Pill, 
  Stethoscope, 
  X, 
  Save, 
  Syringe, 
  Edit, 
  Trash2,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  BrainCircuit,
  Sparkles,
  Loader2,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { analyzeHealthTrends } from '../services/geminiService';

interface HealthModuleProps {
  flocks: Flock[];
  onUpdateFlock: (flock: Flock) => void;
  initialFlockId: string | null;
  inventoryItems: InventoryItem[];
  onUpdateInventory: (item: InventoryItem) => void;
}

const HealthModule: React.FC<HealthModuleProps> = ({
  flocks,
  onUpdateFlock,
  initialFlockId,
  inventoryItems,
  onUpdateInventory
}) => {
  const [activeTab, setActiveTab] = useState<'RECORDS' | 'SCHEDULE' | 'AI'>('RECORDS');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  const [recordForm, setRecordForm] = useState<Partial<MedicalRecord>>({
    date: new Date().toISOString().split('T')[0],
    type: 'CHECKUP',
    title: '',
    description: '',
    flockId: initialFlockId || '',
    status: 'RESOLVED',
    cost: 0
  });

  const medicineItems = inventoryItems.filter(i => i.category === InventoryCategory.MEDICINE);
  
  // Flatten all records for list view
  const allRecords = useMemo(() => {
    const records: (MedicalRecord & { flockName: string })[] = [];
    flocks.forEach(f => {
      if (f.healthRecords) {
        f.healthRecords.forEach(r => {
          records.push({ ...r, flockName: f.name });
        });
      }
    });
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [flocks]);

  const filteredRecords = allRecords.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.flockName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'ALL' || r.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Schedule Logic
  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateStr);
    target.setHours(0,0,0,0);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const upcomingVaccinations = useMemo(() => {
    // Upcoming are VACCINATION types that are NOT RESOLVED (i.e. OPEN or undefined)
    return allRecords
      .filter(r => r.type === 'VACCINATION' && r.status !== 'RESOLVED')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allRecords]);

  const pastVaccinations = useMemo(() => {
    // Past are VACCINATION types that ARE RESOLVED
    return allRecords
      .filter(r => r.type === 'VACCINATION' && r.status === 'RESOLVED')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allRecords]);

  const handleOpenAddRecord = () => {
    setEditingRecordId(null);
    setRecordForm({
      date: new Date().toISOString().split('T')[0],
      type: 'CHECKUP',
      title: '',
      description: '',
      flockId: initialFlockId || (flocks[0]?.id || ''),
      status: 'RESOLVED', // Default to resolved for immediate records
      cost: 0
    });
    setIsRecordModalOpen(true);
  };

  const handleOpenSchedule = (dateOverride?: string) => {
    setEditingRecordId(null);
    // Default to tomorrow for scheduling, or selected date
    const targetDate = dateOverride ? new Date(dateOverride) : new Date();
    if (!dateOverride) targetDate.setDate(targetDate.getDate() + 1);
    
    setRecordForm({
      date: targetDate.toISOString().split('T')[0],
      type: 'VACCINATION',
      title: '',
      description: '',
      flockId: initialFlockId || (flocks[0]?.id || ''),
      status: 'OPEN', // Default to OPEN for scheduled items
      cost: 0
    });
    setIsRecordModalOpen(true);
  };

  const handleEditRecord = (record: MedicalRecord, flockId: string) => {
    setEditingRecordId(record.id);
    setRecordForm({ ...record, flockId });
    setIsRecordModalOpen(true);
  };

  const handleCompleteVaccination = (record: MedicalRecord, flockId: string) => {
    setEditingRecordId(record.id);
    setRecordForm({
        ...record,
        flockId,
        date: new Date().toISOString().split('T')[0], // Default completion date to today
        status: 'RESOLVED' // Mark as resolved
    });
    setIsRecordModalOpen(true);
  };

  const handleDeleteRecord = (recordId: string, flockId: string) => {
    if (!confirm('Are you sure you want to delete this medical record?')) return;
    
    const flock = flocks.find(f => f.id === flockId);
    if (flock && flock.healthRecords) {
        const updatedRecords = flock.healthRecords.filter(r => r.id !== recordId);
        onUpdateFlock({ ...flock, healthRecords: updatedRecords });
    }
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.flockId || !recordForm.title || !recordForm.type) return;

    const flock = flocks.find(f => f.id === recordForm.flockId);
    if (!flock) return;

    // Inventory Deduction
    // Only deduct if status is RESOLVED (actually administered)
    // And safeguard against double deduction if editing an already resolved record without changing items (simplified logic here)
    if (recordForm.status === 'RESOLVED' && recordForm.inventoryItemId && recordForm.quantityUsed) {
        // Simple logic: If new record OR if switching from OPEN to RESOLVED, deduct.
        const originalRecord = editingRecordId ? flock.healthRecords?.find(r => r.id === editingRecordId) : null;
        
        const shouldDeduct = !originalRecord || (originalRecord.status !== 'RESOLVED');

        if (shouldDeduct) {
            const item = inventoryItems.find(i => i.id === recordForm.inventoryItemId);
            if (item) {
                onUpdateInventory({
                    ...item,
                    quantity: Math.max(0, item.quantity - recordForm.quantityUsed),
                    lastUpdated: new Date().toISOString().split('T')[0]
                });
            }
        }
    }

    const newRecord: MedicalRecord = {
        id: editingRecordId || `med-${Date.now()}`,
        date: recordForm.date || new Date().toISOString().split('T')[0],
        type: recordForm.type,
        title: recordForm.title,
        description: recordForm.description,
        flockId: recordForm.flockId,
        medicationName: recordForm.medicationName,
        inventoryItemId: recordForm.inventoryItemId,
        quantityUsed: Number(recordForm.quantityUsed) || 0,
        cost: Number(recordForm.cost) || 0,
        dosage: recordForm.dosage,
        status: recordForm.status // Save status
    };

    const existingRecords = flock.healthRecords || [];
    let updatedRecords;
    
    if (editingRecordId) {
        updatedRecords = existingRecords.map(r => r.id === editingRecordId ? newRecord : r);
    } else {
        updatedRecords = [newRecord, ...existingRecords];
    }

    onUpdateFlock({ ...flock, healthRecords: updatedRecords });
    setIsRecordModalOpen(false);
  };

  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeHealthTrends(allRecords, flocks);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'VACCINATION': return <Syringe size={16} className="text-blue-600" />;
      case 'TREATMENT': return <Pill size={16} className="text-green-600" />;
      default: return <Stethoscope size={16} className="text-slate-600" />;
    }
  };

  const nextMonth = () => {
    const d = new Date(currentCalendarDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentCalendarDate(d);
  };

  const prevMonth = () => {
    const d = new Date(currentCalendarDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentCalendarDate(d);
  };

  const renderCalendar = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const today = new Date();
    today.setHours(0,0,0,0);

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
         <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <Calendar size={18} className="text-blue-600" /> 
               {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-1">
               <button onClick={prevMonth} className="p-1 hover:bg-slate-200 rounded text-slate-500"><ChevronLeft size={20} /></button>
               <button onClick={() => setCurrentCalendarDate(new Date())} className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2">Today</button>
               <button onClick={nextMonth} className="p-1 hover:bg-slate-200 rounded text-slate-500"><ChevronRight size={20} /></button>
            </div>
         </div>
         
         <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 text-center py-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
         </div>
         
         <div className="grid grid-cols-7 auto-rows-fr bg-white flex-1">
            {/* Empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/30"></div>)}
            
            {days.map(day => {
               const dateObj = new Date(year, month, day);
               const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
               const isToday = dateObj.getTime() === today.getTime();
               
               // Find events for this day (Vaccinations only for this view)
               const dayEvents = allRecords.filter(r => r.date === dateStr && r.type === 'VACCINATION');

               return (
                  <div 
                    key={day} 
                    onClick={() => handleOpenSchedule(dateStr)}
                    className={`min-h-[100px] border-b border-r border-slate-100 p-2 relative group hover:bg-slate-50 transition-colors cursor-pointer ${isToday ? 'bg-blue-50/30' : ''}`}
                  >
                     <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                        {day}
                     </span>
                     
                     <div className="mt-1 space-y-1 overflow-y-auto max-h-[70px]">
                        {dayEvents.map(evt => {
                           const isCompleted = evt.status === 'RESOLVED';
                           // Determine color based on status and overdue
                           let bgClass = 'bg-blue-50 text-blue-700 border-blue-100';
                           let dotClass = 'bg-blue-500';
                           
                           if (isCompleted) {
                               bgClass = 'bg-green-50 text-green-700 border-green-100';
                               dotClass = 'bg-green-500';
                           } else if (new Date(evt.date) < today) {
                               bgClass = 'bg-orange-50 text-orange-700 border-orange-100';
                               dotClass = 'bg-orange-500';
                           }

                           return (
                              <div 
                                key={evt.id}
                                onClick={(e) => { e.stopPropagation(); handleEditRecord(evt, evt.flockId); }}
                                className={`text-[10px] px-1.5 py-1 rounded truncate border flex items-center gap-1 shadow-sm ${bgClass}`}
                                title={`${evt.title} - ${evt.flockName} (${isCompleted ? 'Completed' : 'Scheduled'})`}
                              >
                                 <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></div>
                                 <span className={`truncate ${isCompleted ? 'line-through opacity-70' : ''}`}>{evt.title}</span>
                              </div>
                           );
                        })}
                     </div>

                     {/* Quick Add Icon on Hover */}
                     <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-primary-600 transition-opacity">
                        <Plus size={16} />
                     </div>
                  </div>
               );
            })}
         </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <h1 className="text-2xl font-bold text-slate-900">Health & Veterinary</h1>
            <p className="text-slate-500 text-sm mt-1">Manage vaccinations, treatments, and medical records.</p>
         </div>
         <div className="flex bg-white p-1 rounded-lg border border-slate-200 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('RECORDS')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'RECORDS' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileText size={16} /> Medical Records
            </button>
            <button 
              onClick={() => setActiveTab('SCHEDULE')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'SCHEDULE' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Calendar size={16} /> Vaccination Schedule
            </button>
            <button 
              onClick={() => setActiveTab('AI')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'AI' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <BrainCircuit size={16} /> Vet AI
            </button>
         </div>
      </div>

      {activeTab === 'RECORDS' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                      <Pill size={24} />
                  </div>
                  <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Treatments (30d)</p>
                      <h3 className="text-2xl font-bold text-slate-900">
                          {allRecords.filter(r => r.type === 'TREATMENT' && new Date(r.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                      </h3>
                  </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                      <Syringe size={24} />
                  </div>
                  <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vaccinations (30d)</p>
                      <h3 className="text-2xl font-bold text-slate-900">
                          {allRecords.filter(r => r.type === 'VACCINATION' && new Date(r.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                      </h3>
                  </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                      <HeartPulse size={24} />
                  </div>
                  <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Health Spend (MTD)</p>
                      <h3 className="text-2xl font-bold text-slate-900">
                          ${allRecords.reduce((acc, r) => acc + (r.cost || 0), 0).toLocaleString()}
                      </h3>
                  </div>
              </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50">
                 <div className="relative w-full sm:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search records..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                   />
                 </div>
                 <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
                     {['ALL', 'TREATMENT', 'VACCINATION', 'CHECKUP'].map(type => (
                        <button 
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                              filterType === type 
                              ? 'bg-white text-primary-700 shadow-sm ring-1 ring-slate-200' 
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                            {type}
                        </button>
                     ))}
                     <button 
                       onClick={handleOpenAddRecord}
                       className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm whitespace-nowrap"
                     >
                       <Plus size={14} /> Add Record
                     </button>
                 </div>
             </div>
             
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                         <th className="px-6 py-4">Date</th>
                         <th className="px-6 py-4">Type</th>
                         <th className="px-6 py-4">Title / Details</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4">Medication</th>
                         <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {filteredRecords.length > 0 ? filteredRecords.map(record => (
                         <tr key={record.id} className="hover:bg-slate-50 group">
                            <td className="px-6 py-4 text-slate-600 font-mono text-xs">{record.date}</td>
                            <td className="px-6 py-4">
                               <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                                   record.type === 'VACCINATION' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                   record.type === 'TREATMENT' ? 'bg-green-50 text-green-700 border-green-200' :
                                   'bg-slate-100 text-slate-700 border-slate-200'
                               }`}>
                                  {getIconForType(record.type)} {record.type}
                               </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900">
                               {record.title}
                               <div className="text-xs text-slate-500 font-normal mt-0.5">{record.flockName}</div>
                            </td>
                            <td className="px-6 py-4">
                               {record.status === 'RESOLVED' ? (
                                   <span className="text-green-600 flex items-center gap-1 text-xs font-bold"><CheckCircle2 size={12}/> Completed</span>
                               ) : (
                                   <span className="text-orange-600 flex items-center gap-1 text-xs font-bold"><Clock size={12}/> Pending</span>
                               )}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                                {record.medicationName || '-'}
                                {record.dosage && <div className="text-xs text-slate-400">{record.dosage}</div>}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                     onClick={() => handleEditRecord(record, record.flockId)}
                                     className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                                   >
                                      <Edit size={16} />
                                   </button>
                                   <button 
                                     onClick={() => handleDeleteRecord(record.id, record.flockId)}
                                     className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                                   >
                                      <Trash2 size={16} />
                                   </button>
                               </div>
                            </td>
                         </tr>
                      )) : (
                         <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                               No health records found.
                            </td>
                         </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'SCHEDULE' && (
        <div className="space-y-6 animate-in fade-in duration-300">
           <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                 <h3 className="text-lg font-bold text-slate-900">Vaccination Program</h3>
                 <p className="text-sm text-slate-500">Plan and track upcoming immunizations for all flocks.</p>
              </div>
              <button 
                onClick={() => handleOpenSchedule()}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
              >
                <Plus size={16} /> Schedule Vaccination
              </button>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
              {/* Calendar View - Takes 2/3 space */}
              <div className="lg:col-span-2 h-full">
                 {renderCalendar()}
              </div>

              {/* Upcoming List - Takes 1/3 space */}
              <div className="lg:col-span-1 flex flex-col gap-6 h-full">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
                     <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                           <Clock size={18} className="text-orange-500" /> Next Up
                        </h4>
                        <span className="text-xs font-bold bg-white border px-2 py-1 rounded text-slate-500">
                           {upcomingVaccinations.length}
                        </span>
                     </div>
                     <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                        {upcomingVaccinations.length > 0 ? upcomingVaccinations.map(record => {
                           const daysUntil = getDaysUntil(record.date);
                           return (
                             <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors group">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-blue-50 rounded-lg border border-blue-100 text-blue-700">
                                       <span className="text-[10px] font-bold uppercase">{new Date(record.date).toLocaleString('default', { month: 'short' })}</span>
                                       <span className="text-lg font-bold leading-none">{new Date(record.date).getDate()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-start">
                                          <h5 className="font-bold text-slate-900 truncate">{record.title}</h5>
                                          <div className="flex gap-1">
                                              <button 
                                                onClick={() => handleCompleteVaccination(record, record.flockId)}
                                                className="text-white bg-green-500 hover:bg-green-600 p-1 rounded transition-colors shadow-sm"
                                                title="Log / Complete Vaccination"
                                              >
                                                  <Check size={12} strokeWidth={3} />
                                              </button>
                                              <button onClick={() => handleEditRecord(record, record.flockId)} className="text-slate-400 hover:text-blue-600 p-1"><Edit size={12}/></button>
                                          </div>
                                       </div>
                                       <p className="text-xs text-slate-600 truncate">{record.flockName}</p>
                                       
                                       <div className="flex items-center gap-2 mt-1.5">
                                          {daysUntil <= 0 ? (
                                             <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <AlertCircle size={10} /> {daysUntil === 0 ? 'Due Today' : 'Overdue'}
                                             </span>
                                          ) : (
                                             <span className="text-[10px] text-slate-500">
                                                In {daysUntil} days
                                             </span>
                                          )}
                                       </div>
                                    </div>
                                </div>
                             </div>
                           );
                        }) : (
                           <div className="p-8 text-center text-slate-400 text-sm">No upcoming vaccinations.</div>
                        )}
                     </div>
                  </div>

                  {/* History List */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-64 shrink-0">
                     <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                           <CheckCircle2 size={18} className="text-green-600" /> Recent History
                        </h4>
                     </div>
                     <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                        {pastVaccinations.length > 0 ? pastVaccinations.map(record => (
                           <div key={record.id} className="p-3 hover:bg-slate-50 transition-colors flex gap-3 opacity-80">
                              <div className="flex-shrink-0 flex flex-col items-center justify-center w-10 h-10 bg-slate-100 rounded-lg border border-slate-200 text-slate-500">
                                 <span className="text-[9px] font-bold uppercase">{new Date(record.date).toLocaleString('default', { month: 'short' })}</span>
                                 <span className="text-sm font-bold leading-none">{new Date(record.date).getDate()}</span>
                              </div>
                              <div className="flex-1">
                                 <h5 className="text-xs font-bold text-slate-700">{record.title}</h5>
                                 <p className="text-[10px] text-slate-500">
                                    {record.flockName}
                                 </p>
                                 <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                                    Completed
                                 </span>
                              </div>
                           </div>
                        )) : (
                           <div className="p-8 text-center text-slate-400 text-sm">No vaccination history.</div>
                        )}
                     </div>
                  </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'AI' && (
        <div className="space-y-6 animate-in fade-in duration-300">
           <div className="bg-gradient-to-r from-teal-600 to-emerald-700 rounded-xl p-8 text-white shadow-xl">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                       <BrainCircuit size={32} />
                    </div>
                    <div>
                       <h2 className="text-2xl font-bold">Veterinary Health Analyst</h2>
                       <p className="text-teal-100 mt-1 max-w-xl text-sm leading-relaxed opacity-90">
                          AI-powered pathology analysis. Evaluate symptoms, mortality trends, and vaccination history to detect outbreaks early.
                       </p>
                    </div>
                 </div>
                 <button 
                   onClick={handleRunAiAnalysis}
                   disabled={isAnalyzing}
                   className="bg-white text-teal-700 px-6 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 hover:bg-teal-50 disabled:opacity-70 disabled:cursor-not-allowed"
                 >
                    {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isAnalyzing ? 'Analyzing Data...' : 'Run Health Audit'}
                 </button>
              </div>
           </div>

           {aiAnalysis && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                 {/* Clinical Assessment */}
                 <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                       <Activity size={20} className="text-slate-500" />
                       <h3 className="font-bold text-slate-800">Clinical Assessment</h3>
                    </div>
                    <div className="prose prose-sm text-slate-600 max-w-none leading-relaxed">
                       {aiAnalysis.analysis.split('\n').map((line, i) => (
                          <p key={i} className="mb-2">{line}</p>
                       ))}
                    </div>
                 </div>

                 {/* Risk & Recommendations */}
                 <div className="space-y-6">
                    <div className={`p-6 rounded-xl border flex flex-col items-center justify-center text-center shadow-sm ${
                        aiAnalysis.alertLevel === 'HIGH' ? 'bg-red-50 border-red-200 text-red-800' :
                        aiAnalysis.alertLevel === 'MEDIUM' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                        'bg-green-50 border-green-200 text-green-800'
                    }`}>
                        <div className={`p-3 rounded-full mb-3 ${
                            aiAnalysis.alertLevel === 'HIGH' ? 'bg-red-100' :
                            aiAnalysis.alertLevel === 'MEDIUM' ? 'bg-orange-100' : 'bg-green-100'
                        }`}>
                            <ShieldCheck size={24} />
                        </div>
                        <h4 className="font-bold text-lg">Biosecurity Risk</h4>
                        <p className="text-2xl font-black mt-1">{aiAnalysis.alertLevel}</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                       <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-teal-600" /> Recommended Protocols
                       </h3>
                       <ul className="space-y-3">
                          {aiAnalysis.recommendations.map((rec, i) => (
                             <li key={i} className="flex gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="font-bold text-slate-400">{i+1}.</span>
                                {rec}
                             </li>
                          ))}
                       </ul>
                    </div>
                 </div>
              </div>
           )}
        </div>
      )}

      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="font-bold text-lg text-slate-900">
                    {editingRecordId ? 'Edit Record' : (recordForm.status === 'OPEN' ? 'Schedule Vaccination' : 'Log Vaccination')}
                </h3>
                <button onClick={() => setIsRecordModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
             </div>
             <form onSubmit={handleSaveRecord} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                       <label className="block text-sm font-medium text-slate-700 mb-1">Target Flock</label>
                       <select 
                         required
                         value={recordForm.flockId}
                         onChange={e => setRecordForm({...recordForm, flockId: e.target.value})}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                       >
                         <option value="">Select Flock...</option>
                         {flocks.filter(f => f.status === FlockStatus.ACTIVE || f.status === FlockStatus.QUARANTINE).map(f => (
                           <option key={f.id} value={f.id}>{f.name}</option>
                         ))}
                       </select>
                   </div>
                   
                   <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">
                           {recordForm.status === 'RESOLVED' ? 'Date Administered' : 'Scheduled Date'}
                       </label>
                       <input 
                         type="date" 
                         value={recordForm.date}
                         onChange={e => setRecordForm({...recordForm, date: e.target.value})}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                       />
                   </div>
                   
                   <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                       <select 
                         value={recordForm.status}
                         onChange={e => setRecordForm({...recordForm, status: e.target.value as any})}
                         className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 outline-none bg-white font-bold ${
                             recordForm.status === 'RESOLVED' ? 'text-green-600 focus:ring-green-500' : 'text-orange-600 focus:ring-orange-500'
                         }`}
                       >
                         <option value="OPEN">Scheduled / Pending</option>
                         <option value="RESOLVED">Completed / Logged</option>
                       </select>
                   </div>

                   <div className="col-span-2">
                       <label className="block text-sm font-medium text-slate-700 mb-1">Record Type</label>
                       <select 
                         value={recordForm.type}
                         onChange={e => setRecordForm({...recordForm, type: e.target.value as any})}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                       >
                         <option value="TREATMENT">Treatment</option>
                         <option value="VACCINATION">Vaccination</option>
                         <option value="CHECKUP">Routine Checkup</option>
                       </select>
                   </div>
                   
                   <div className="col-span-2">
                       <label className="block text-sm font-medium text-slate-700 mb-1">
                           {recordForm.type === 'VACCINATION' ? 'Vaccine Name' : 'Title / Issue'}
                       </label>
                       <input 
                         required
                         type="text" 
                         value={recordForm.title}
                         onChange={e => setRecordForm({...recordForm, title: e.target.value})}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                         placeholder={
                            recordForm.type === 'VACCINATION' ? 'e.g. Newcastle Vaccine' : 
                            'e.g. Respiratory Infection'
                         }
                       />
                   </div>

                   {(recordForm.type === 'TREATMENT' || recordForm.type === 'VACCINATION') && (
                     <div className="col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-4">
                        <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                            <Pill size={16} /> Medication Details
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            {/* Inventory Selection */}
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-medium text-blue-700 mb-1">Select from Inventory (Optional)</label>
                                <select
                                    value={recordForm.inventoryItemId || ''}
                                    onChange={(e) => {
                                        const itemId = e.target.value;
                                        const item = inventoryItems.find(i => i.id === itemId);
                                        setRecordForm(prev => ({
                                            ...prev, 
                                            inventoryItemId: itemId,
                                            medicationName: item ? item.name : prev.medicationName, 
                                            cost: item && prev.quantityUsed ? (item.costPerUnit * prev.quantityUsed) : prev.cost 
                                        }));
                                    }}
                                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                                >
                                    <option value="">-- Manual Entry --</option>
                                    {medicineItems.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.name} ({item.quantity} {item.unit} avail)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Manual Name */}
                             <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-medium text-blue-700 mb-1">Medication Name</label>
                                <input 
                                    type="text" 
                                    value={recordForm.medicationName || ''}
                                    onChange={e => setRecordForm({...recordForm, medicationName: e.target.value})}
                                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="e.g. Amoxicillin"
                                />
                            </div>

                            {/* Quantity Used */}
                            {recordForm.inventoryItemId && (
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-medium text-blue-700 mb-1">
                                        Quantity to Deduct ({medicineItems.find(i => i.id === recordForm.inventoryItemId)?.unit})
                                    </label>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={recordForm.quantityUsed || ''}
                                        onChange={e => {
                                            const qty = Number(e.target.value);
                                            const item = inventoryItems.find(i => i.id === recordForm.inventoryItemId);
                                            setRecordForm(prev => ({
                                                ...prev, 
                                                quantityUsed: qty,
                                                cost: item ? (item.costPerUnit * qty) : prev.cost
                                            }));
                                        }}
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                    {recordForm.status === 'OPEN' && (
                                        <p className="text-[10px] text-blue-600 mt-1 italic">
                                            *Inventory will be deducted when marked as Completed.
                                        </p>
                                    )}
                                </div>
                            )}

                             <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-medium text-blue-700 mb-1">Dosage Instructions</label>
                                <input 
                                    type="text" 
                                    value={recordForm.dosage || ''}
                                    onChange={e => setRecordForm({...recordForm, dosage: e.target.value})}
                                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="e.g. 10ml per 100 birds"
                                />
                            </div>
                        </div>
                     </div>
                   )}
                   
                   <div className="col-span-2">
                       <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Description</label>
                       <textarea 
                         rows={2}
                         value={recordForm.description}
                         onChange={e => setRecordForm({...recordForm, description: e.target.value})}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                       />
                   </div>
                </div>
                
                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                   <button 
                     type="button" 
                     onClick={() => setIsRecordModalOpen(false)}
                     className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     className={`px-4 py-2 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 ${
                         recordForm.status === 'RESOLVED' 
                         ? 'bg-green-600 hover:bg-green-700' 
                         : 'bg-primary-600 hover:bg-primary-700'
                     }`}
                   >
                     <Save size={18} /> {editingRecordId ? 'Update Record' : (recordForm.status === 'RESOLVED' ? 'Save Log' : 'Schedule')}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthModule;