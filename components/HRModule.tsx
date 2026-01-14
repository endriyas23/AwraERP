import React, { useState } from 'react';
import { Employee, PayrollRun, HrTask, Flock, Transaction } from '../types';
import { 
  Users, 
  UserPlus, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Briefcase, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Wallet, 
  FileText, 
  AlertTriangle, 
  X, 
  Save, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  Edit,
  Bird,
  Trash2,
  Trash
} from 'lucide-react';

interface HRModuleProps {
  employees: Employee[];
  tasks: HrTask[];
  flocks: Flock[];
  payrollHistory: PayrollRun[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onAddTask: (task: HrTask) => void;
  onUpdateTask: (task: HrTask) => void;
  onDeleteTask: (id: string) => void;
  onAddTransaction: (tx: Transaction) => void;
  onAddPayrollRun: (run: PayrollRun) => void;
}

const HRModule: React.FC<HRModuleProps> = ({ 
  employees, 
  tasks, 
  flocks,
  payrollHistory,
  onAddEmployee, 
  onUpdateEmployee, 
  onDeleteEmployee,
  onAddTask, 
  onUpdateTask,
  onDeleteTask,
  onAddTransaction,
  onAddPayrollRun
}) => {
  const [activeTab, setActiveTab] = useState<'TEAM' | 'PAYROLL' | 'TASKS' | 'CALENDAR'>('TEAM');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{type: 'EMPLOYEE' | 'TASK', id: string} | null>(null);

  // -- Employee Form State --
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState<Partial<Employee>>({
    name: '',
    role: 'Farm Hand',
    phone: '',
    baseSalary: 0,
    allowances: 0,
    deductions: 0,
    taxRate: 10,
    pensionRate: 8,
    status: 'ACTIVE'
  });

  // -- Task Form State --
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<Partial<HrTask>>({
    title: '',
    priority: 'MEDIUM',
    status: 'PENDING',
    dueDate: new Date().toISOString().split('T')[0],
    relatedFlockId: ''
  });

  // -- Payroll State --
  const [currentPayroll, setCurrentPayroll] = useState<PayrollRun | null>(null);
  const [payrollStep, setPayrollStep] = useState<1 | 2>(1); // 1: Selection, 2: Confirmation
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set());

  // --- Handlers ---

  const handleOpenAddEmployee = () => {
    setEditingEmpId(null);
    setEmpForm({ 
      name: '', 
      role: 'Farm Hand', 
      phone: '', 
      baseSalary: 0, 
      allowances: 0, 
      deductions: 0,
      taxRate: 10,
      pensionRate: 8,
      status: 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setEmpForm({ ...emp });
    setIsModalOpen(true);
  };

  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
        name: empForm.name || 'New Employee',
        role: empForm.role || 'Staff',
        phone: empForm.phone || '',
        email: empForm.email || '',
        baseSalary: Number(empForm.baseSalary) || 0,
        allowances: Number(empForm.allowances) || 0,
        deductions: Number(empForm.deductions) || 0,
        taxRate: Number(empForm.taxRate) || 0,
        pensionRate: Number(empForm.pensionRate) || 0,
        status: empForm.status || 'ACTIVE'
    };

    if (editingEmpId) {
        onUpdateEmployee({ 
            ...payload, 
            id: editingEmpId, 
            joinedDate: empForm.joinedDate || new Date().toISOString().split('T')[0] 
        } as Employee);
    } else {
        onAddEmployee({ 
            ...payload, 
            id: `emp-${Date.now()}`, 
            joinedDate: new Date().toISOString().split('T')[0] 
        } as Employee);
    }

    setIsModalOpen(false);
  };

  const confirmDelete = (type: 'EMPLOYEE' | 'TASK', id: string) => {
    setDeleteConfirm({ type, id });
  };

  const executeDelete = () => {
    if (!deleteConfirm) return;
    
    if (deleteConfirm.type === 'EMPLOYEE') {
        onDeleteEmployee(deleteConfirm.id);
    } else {
        onDeleteTask(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  const openTaskModal = (task?: HrTask) => {
    if (task) {
      setEditingTaskId(task.id);
      setTaskForm({
        ...task
      });
    } else {
      setEditingTaskId(null);
      setTaskForm({
        title: '',
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDate: new Date().toISOString().split('T')[0],
        relatedFlockId: '',
        description: '',
        assignedToId: ''
      });
    }
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!taskForm.assignedToId || !taskForm.title) return;
    
    const assignee = employees.find(e => e.id === taskForm.assignedToId);
    
    if (editingTaskId) {
      const updatedTask: HrTask = {
        id: editingTaskId,
        title: taskForm.title,
        description: taskForm.description || '',
        assignedToId: taskForm.assignedToId,
        assignedToName: assignee?.name || 'Unknown',
        relatedFlockId: taskForm.relatedFlockId,
        priority: taskForm.priority as any,
        dueDate: taskForm.dueDate || new Date().toISOString().split('T')[0],
        status: taskForm.status as any
      };
      onUpdateTask(updatedTask);
    } else {
      onAddTask({
        id: `task-${Date.now()}`,
        title: taskForm.title,
        description: taskForm.description || '',
        assignedToId: taskForm.assignedToId,
        assignedToName: assignee?.name || 'Unknown',
        relatedFlockId: taskForm.relatedFlockId,
        priority: taskForm.priority || 'MEDIUM',
        dueDate: taskForm.dueDate || new Date().toISOString().split('T')[0],
        status: 'PENDING'
      });
    }
    
    setIsTaskModalOpen(false);
    setEditingTaskId(null);
    setTaskForm({ title: '', priority: 'MEDIUM', status: 'PENDING', dueDate: new Date().toISOString().split('T')[0], relatedFlockId: '' });
  };

  // Initialize Payroll Wizard
  const initiatePayrollRun = () => {
    // Default select all active employees
    const activeIds = employees.filter(e => e.status === 'ACTIVE').map(e => e.id);
    setSelectedEmpIds(new Set(activeIds));
    setPayrollStep(1);
    setIsPayrollModalOpen(true);
  };

  const toggleEmployeeSelection = (id: string) => {
    const newSet = new Set(selectedEmpIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedEmpIds(newSet);
  };

  const toggleSelectAll = () => {
    const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
    if (selectedEmpIds.size === activeEmployees.length) {
      setSelectedEmpIds(new Set());
    } else {
      setSelectedEmpIds(new Set(activeEmployees.map(e => e.id)));
    }
  };

  const calculatePayroll = () => {
    const selectedEmployees = employees.filter(e => selectedEmpIds.has(e.id));
    
    let totalGross = 0;
    let totalNet = 0;
    let totalTax = 0;
    let totalPension = 0;

    selectedEmployees.forEach(emp => {
      const gross = emp.baseSalary + emp.allowances;
      
      // Use stored rates or defaults
      const tRate = emp.taxRate !== undefined ? emp.taxRate : 10;
      const pRate = emp.pensionRate !== undefined ? emp.pensionRate : 8;

      const tax = gross * (tRate / 100);
      const pension = gross * (pRate / 100);
      const net = gross - tax - pension - emp.deductions;

      totalGross += gross;
      totalNet += net;
      totalTax += tax;
      totalPension += pension;
    });

    const run: PayrollRun = {
      id: `pay-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      period: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalGross,
      totalNet,
      totalTax,
      totalPension,
      status: 'DRAFT',
      employeeCount: selectedEmployees.length
    };
    setCurrentPayroll(run);
    setPayrollStep(2); // Move to confirmation step
  };

  const confirmPayroll = () => {
    if (!currentPayroll) return;
    
    const finalizedRun = {...currentPayroll, status: 'PAID' as const};

    // 1. Add to History (Persistent)
    onAddPayrollRun(finalizedRun);
    
    // 2. Post to Finance
    onAddTransaction({
      id: `tx-pay-${currentPayroll.id}`,
      date: currentPayroll.date,
      type: 'EXPENSE',
      category: 'Labor',
      amount: currentPayroll.totalGross, // Cost to company
      subTotal: currentPayroll.totalGross,
      whtAmount: currentPayroll.totalTax, // Track PAYE as WHT Liability
      pensionAmount: currentPayroll.totalPension, // Track Pension Liability
      description: `Payroll Run - ${currentPayroll.period} (${currentPayroll.employeeCount} employees)`
    });

    setIsPayrollModalOpen(false);
    setCurrentPayroll(null);
  };

  // Helpers for display
  const getEstimatedNet = (emp: Employee) => {
    const gross = emp.baseSalary + emp.allowances;
    
    const tRate = emp.taxRate !== undefined ? emp.taxRate : 10;
    const pRate = emp.pensionRate !== undefined ? emp.pensionRate : 8;

    const tax = gross * (tRate / 100);
    const pension = gross * (pRate / 100);
    return gross - tax - pension - emp.deductions;
  };

  // --- Render Helpers ---

  const renderCalendar = () => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
           <h3 className="font-bold text-slate-800 flex items-center gap-2">
             <Calendar size={18} /> {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
           </h3>
           <div className="flex gap-1">
             <button className="p-1 hover:bg-slate-200 rounded"><ChevronLeft size={16} /></button>
             <button className="p-1 hover:bg-slate-200 rounded"><ChevronRight size={16} /></button>
           </div>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 text-center py-2">
           {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr bg-white">
           {/* Empty cells for prev month */}
           {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/30"></div>)}
           
           {days.map(day => {
             const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
             const dayTasks = tasks.filter(t => t.dueDate === dateStr);
             
             return (
               <div key={day} className="min-h-[100px] border-b border-r border-slate-100 p-2 relative group hover:bg-slate-50 transition-colors">
                  <span className={`text-sm font-medium ${dayTasks.length > 0 ? 'text-primary-600' : 'text-slate-700'}`}>{day}</span>
                  <div className="mt-1 space-y-1">
                     {dayTasks.map(t => (
                       <div key={t.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate border ${
                         t.priority === 'HIGH' ? 'bg-red-50 text-red-700 border-red-100' :
                         t.priority === 'MEDIUM' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                         'bg-blue-50 text-blue-700 border-blue-100'
                       }`}>
                         {t.title}
                       </div>
                     ))}
                  </div>
                  {/* Hover Add Button */}
                  <button 
                    onClick={() => {
                        setTaskForm({...taskForm, dueDate: dateStr});
                        setIsTaskModalOpen(true);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary-600"
                  >
                    <Plus size={16} />
                  </button>
               </div>
             )
           })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">HR & Operations</h1>
          <p className="text-slate-500 text-sm mt-1">Manage workforce, payroll, and daily farm tasks.</p>
        </div>
        
        <div className="bg-white p-1 rounded-lg border border-slate-200 flex overflow-x-auto">
           <button onClick={() => setActiveTab('TEAM')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'TEAM' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
             <Users size={16} /> Team
           </button>
           <button onClick={() => setActiveTab('PAYROLL')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'PAYROLL' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
             <Wallet size={16} /> Payroll
           </button>
           <button onClick={() => setActiveTab('TASKS')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'TASKS' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
             <CheckCircle2 size={16} /> Tasks
           </button>
           <button onClick={() => setActiveTab('CALENDAR')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'CALENDAR' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
             <Calendar size={16} /> Calendar
           </button>
        </div>
      </div>

      {/* TEAM TAB */}
      {activeTab === 'TEAM' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center">
              <div className="relative w-64">
                 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Search employees..." 
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                 />
              </div>
              <button 
                onClick={handleOpenAddEmployee}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
              >
                <UserPlus size={16} /> Add Employee
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map(emp => (
                 <div key={emp.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow group relative">
                    <div className="flex items-start justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg">
                             {emp.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                             <h3 className="font-bold text-slate-900">{emp.name}</h3>
                             <p className="text-xs text-slate-500 uppercase tracking-wide">{emp.role}</p>
                          </div>
                       </div>
                       <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {emp.status}
                       </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-slate-600 mb-4">
                       <div className="flex justify-between">
                          <span>Base Salary:</span>
                          <span className="font-medium text-slate-900">${emp.baseSalary.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between">
                          <span>Allowances:</span>
                          <span className="font-medium text-slate-900">${emp.allowances.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between">
                          <span>Phone:</span>
                          <span className="font-medium text-slate-900">{emp.phone}</span>
                       </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                       <button 
                         onClick={() => handleOpenEditEmployee(emp)}
                         className="text-slate-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-colors"
                         title="Edit Employee"
                       >
                         <Edit size={16} />
                       </button>
                       <button 
                         onClick={() => confirmDelete('EMPLOYEE', emp.id)}
                         className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                         title="Delete Employee"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* PAYROLL TAB */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl text-white shadow-lg">
              <div>
                 <h2 className="text-xl font-bold">Payroll Center</h2>
                 <p className="text-slate-400 text-sm mt-1">Manage monthly salaries, taxes, and pensions.</p>
              </div>
              <button 
                onClick={initiatePayrollRun}
                className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all"
              >
                <DollarSign size={20} /> Run Payroll
              </button>
           </div>

           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                 <h3 className="font-bold text-slate-800">Payroll History</h3>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                       <tr>
                          <th className="px-6 py-4">Period</th>
                          <th className="px-6 py-4">Date Run</th>
                          <th className="px-6 py-4">Employees</th>
                          <th className="px-6 py-4">Total Gross</th>
                          <th className="px-6 py-4">Tax (PAYE)</th>
                          <th className="px-6 py-4">Pension</th>
                          <th className="px-6 py-4">Net Pay</th>
                          <th className="px-6 py-4">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {payrollHistory.length > 0 ? payrollHistory.map(run => (
                          <tr key={run.id} className="hover:bg-slate-50">
                             <td className="px-6 py-4 font-bold text-slate-900">{run.period}</td>
                             <td className="px-6 py-4 text-slate-500">{run.date}</td>
                             <td className="px-6 py-4">{run.employeeCount}</td>
                             <td className="px-6 py-4 text-slate-700">${run.totalGross.toLocaleString()}</td>
                             <td className="px-6 py-4 text-slate-700">${run.totalTax.toLocaleString()}</td>
                             <td className="px-6 py-4 text-slate-700">${run.totalPension.toLocaleString()}</td>
                             <td className="px-6 py-4 font-bold text-green-600">${run.totalNet.toLocaleString()}</td>
                             <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">PAID</span>
                             </td>
                          </tr>
                       )) : (
                          <tr>
                             <td colSpan={8} className="px-6 py-12 text-center text-slate-400">No payroll history available.</td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {/* TASKS TAB */}
      {activeTab === 'TASKS' && (
        <div className="space-y-4">
           <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Operations Tasks</h2>
              <button 
                onClick={() => openTaskModal()}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Plus size={16} /> Assign Task
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['PENDING', 'IN_PROGRESS', 'COMPLETED'].map(status => (
                 <div key={status} className="bg-slate-100 rounded-xl p-4">
                    <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                       {status === 'PENDING' ? <Clock size={14}/> : status === 'IN_PROGRESS' ? <Briefcase size={14}/> : <CheckCircle2 size={14}/>}
                       {status.replace('_', ' ')}
                       <span className="bg-slate-200 px-1.5 rounded text-[10px]">{tasks.filter(t => t.status === status).length}</span>
                    </h3>
                    <div className="space-y-3">
                       {tasks.filter(t => t.status === status).map(task => {
                          const relatedFlock = flocks.find(f => f.id === task.relatedFlockId);
                          return (
                            <div key={task.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative">
                               <div className="flex justify-between items-start mb-1">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                     task.priority === 'HIGH' ? 'bg-red-50 text-red-600 border-red-100' :
                                     task.priority === 'MEDIUM' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                     'bg-blue-50 text-blue-600 border-blue-100'
                                  }`}>
                                     {task.priority}
                                  </span>
                                  <div className="flex gap-1">
                                    <button onClick={() => openTaskModal(task)} className="text-slate-300 hover:text-slate-600 p-1 hover:bg-slate-50 rounded">
                                      <Edit size={14} />
                                    </button>
                                    <button onClick={() => confirmDelete('TASK', task.id)} className="text-slate-300 hover:text-red-600 p-1 hover:bg-red-50 rounded">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                               </div>
                               <h4 className="font-bold text-slate-800 text-sm mb-1">{task.title}</h4>
                               <p className="text-xs text-slate-500 mb-2">{task.description}</p>
                               
                               {relatedFlock && (
                                  <div className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded mb-2 flex items-center gap-1 w-fit">
                                      <Bird size={12} /> {relatedFlock.name}
                                  </div>
                               )}

                               <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-xs text-slate-500">
                                  <span className="flex items-center gap-1"><Users size={12}/> {task.assignedToName.split(' ')[0]}</span>
                                  <span className="flex items-center gap-1"><Calendar size={12}/> {task.dueDate}</span>
                               </div>
                               
                               {status !== 'COMPLETED' && (
                                  <button 
                                    onClick={() => onUpdateTask({...task, status: 'COMPLETED'})}
                                    className="w-full mt-2 py-1 text-xs border border-green-200 text-green-600 rounded hover:bg-green-50 transition-colors"
                                  >
                                     Mark Complete
                                  </button>
                               )}
                            </div>
                          );
                       })}
                       {tasks.filter(t => t.status === status).length === 0 && (
                          <div className="text-center py-4 text-slate-400 text-xs italic">No tasks</div>
                       )}
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* CALENDAR TAB */}
      {activeTab === 'CALENDAR' && renderCalendar()}

      {/* -- MODALS -- */}

      {/* Add/Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
             <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900">{editingEmpId ? 'Edit Employee' : 'Add New Employee'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
             </div>
             <form onSubmit={handleEmployeeSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                      <input 
                        required
                        type="text" 
                        value={empForm.name}
                        onChange={e => setEmpForm({...empForm, name: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                      <select 
                        value={empForm.role}
                        onChange={e => setEmpForm({...empForm, role: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                      >
                         <option>Farm Manager</option>
                         <option>Farm Hand</option>
                         <option>Vet Technician</option>
                         <option>Security</option>
                         <option>Driver</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      <input 
                        type="tel" 
                        value={empForm.phone}
                        onChange={e => setEmpForm({...empForm, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                      />
                   </div>
                   
                   <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                      <h4 className="font-bold text-sm text-slate-800 mb-3">Salary Structure</h4>
                   </div>

                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Base Salary</label>
                      <input 
                        type="number" 
                        min="0"
                        value={empForm.baseSalary}
                        onChange={e => setEmpForm({...empForm, baseSalary: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Allowances</label>
                      <input 
                        type="number" 
                        min="0"
                        value={empForm.allowances}
                        onChange={e => setEmpForm({...empForm, allowances: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Deductions</label>
                      <input 
                        type="number" 
                        min="0"
                        value={empForm.deductions}
                        onChange={e => setEmpForm({...empForm, deductions: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        value={empForm.taxRate}
                        onChange={e => setEmpForm({...empForm, taxRate: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Pension Rate (%)</label>
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        value={empForm.pensionRate}
                        onChange={e => setEmpForm({...empForm, pensionRate: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                      />
                   </div>
                   
                   {editingEmpId && (
                       <div className="col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                          <select 
                            value={empForm.status}
                            onChange={e => setEmpForm({...empForm, status: e.target.value as any})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                          >
                             <option value="ACTIVE">Active</option>
                             <option value="INACTIVE">Inactive</option>
                          </select>
                       </div>
                   )}
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
                   <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm">
                     {editingEmpId ? 'Update Employee' : 'Save Employee'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <Trash size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Delete {deleteConfirm.type === 'EMPLOYEE' ? 'Employee' : 'Task'}?</h3>
              <p className="text-slate-500 text-sm mb-6">
                 Are you sure you want to delete this {deleteConfirm.type === 'EMPLOYEE' ? 'employee record' : 'task'}? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                 <button 
                   onClick={() => setDeleteConfirm(null)}
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

      {/* Payroll Wizard Modal */}
      {isPayrollModalOpen && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
               <div className="p-6 bg-slate-900 text-white rounded-t-xl shrink-0">
                  <h3 className="text-xl font-bold">
                    {payrollStep === 1 ? 'Select Employees' : 'Confirm Payroll'}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {payrollStep === 1 ? 'Choose who to include in this pay run' : `Review summary for ${selectedEmpIds.size} employees`}
                  </p>
               </div>
               
               {/* STEP 1: SELECTION */}
               {payrollStep === 1 && (
                 <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <span className="text-sm font-bold text-slate-700">Active Staff</span>
                        <button 
                          onClick={toggleSelectAll}
                          className="text-xs font-medium text-primary-600 hover:text-primary-800"
                        >
                          {selectedEmpIds.size === employees.filter(e => e.status === 'ACTIVE').length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {employees.filter(e => e.status === 'ACTIVE').map(emp => (
                            <label key={emp.id} className="flex items-center gap-4 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                <input 
                                  type="checkbox"
                                  checked={selectedEmpIds.has(emp.id)}
                                  onChange={() => toggleEmployeeSelection(emp.id)}
                                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                />
                                <div className="flex-1">
                                    <div className="font-bold text-slate-900">{emp.name}</div>
                                    <div className="text-xs text-slate-500">{emp.role}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-slate-900">${getEstimatedNet(emp).toLocaleString()}</div>
                                    <div className="text-[10px] text-slate-400">Est. Net</div>
                                </div>
                            </label>
                        ))}
                    </div>
                 </div>
               )}

               {/* STEP 2: SUMMARY */}
               {payrollStep === 2 && currentPayroll && (
                 <div className="p-6 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                       <div className="flex justify-between mb-2 text-sm">
                          <span className="text-slate-600">Total Employees</span>
                          <span className="font-bold text-slate-900">{currentPayroll.employeeCount}</span>
                       </div>
                       <div className="flex justify-between mb-2 text-sm">
                          <span className="text-slate-600">Total Gross Pay</span>
                          <span className="font-bold text-slate-900">${currentPayroll.totalGross.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between mb-2 text-sm text-red-600">
                          <span>Total Tax</span>
                          <span>-${currentPayroll.totalTax.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between mb-2 text-sm text-red-600">
                          <span>Total Pension</span>
                          <span>-${currentPayroll.totalPension.toLocaleString()}</span>
                       </div>
                       <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-bold text-lg">
                          <span className="text-slate-800">Total Payout</span>
                          <span className="text-primary-600">${currentPayroll.totalNet.toLocaleString()}</span>
                       </div>
                    </div>
                    <p className="text-xs text-slate-500 text-center">
                       Confirming will automatically post an expense transaction to the Financial Ledger.
                    </p>
                 </div>
               )}

               <div className="p-4 border-t border-slate-200 shrink-0 flex gap-3">
                  <button onClick={() => setIsPayrollModalOpen(false)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-lg font-bold">
                    Cancel
                  </button>
                  
                  {payrollStep === 1 ? (
                      <button 
                        onClick={calculatePayroll}
                        disabled={selectedEmpIds.size === 0}
                        className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next <ArrowRight size={16} />
                      </button>
                  ) : (
                      <div className="flex-1 flex gap-3">
                          <button 
                            onClick={() => setPayrollStep(1)}
                            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                          >
                            Back
                          </button>
                          <button 
                            onClick={confirmPayroll}
                            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg flex items-center justify-center gap-2"
                          >
                            Confirm <Check size={16} />
                          </button>
                      </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* Task Modal */}
      {isTaskModalOpen && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
               <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-900">{editingTaskId ? 'Edit Task' : 'Assign New Task'}</h3>
                  <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
               </div>
               <form onSubmit={handleTaskSubmit} className="p-6 space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                     <input 
                        required
                        type="text" 
                        value={taskForm.title} 
                        onChange={e => setTaskForm({...taskForm, title: e.target.value})} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g. Clean Silo B"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                     <select 
                        required
                        value={taskForm.assignedToId || ''} 
                        onChange={e => setTaskForm({...taskForm, assignedToId: e.target.value})} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                     >
                        <option value="">Select Employee...</option>
                        {employees.filter(e => e.status === 'ACTIVE').map(e => (
                           <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                        ))}
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Related Flock (Optional)</label>
                     <select 
                        value={taskForm.relatedFlockId || ''} 
                        onChange={e => setTaskForm({...taskForm, relatedFlockId: e.target.value})} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                     >
                        <option value="">None / General Farm Task</option>
                        {flocks.map(f => (
                           <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                     </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                        <select 
                           value={taskForm.priority} 
                           onChange={e => setTaskForm({...taskForm, priority: e.target.value as any})} 
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                           <option value="LOW">Low</option>
                           <option value="MEDIUM">Medium</option>
                           <option value="HIGH">High</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                        <input 
                           type="date" 
                           value={taskForm.dueDate} 
                           onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} 
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                        />
                     </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end gap-3">
                     <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
                     <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm">{editingTaskId ? 'Update Task' : 'Assign Task'}</button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default HRModule;