import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Flock, 
  InventoryItem, 
  Customer, 
  SalesOrder, 
  DailyLog,
  BirdType,
  InventoryCategory,
  AnalysisResult,
  FlockStatus,
  Transaction
} from '../types';
import { 
  ArrowLeft, 
  Calendar, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  Save, 
  X,
  FileText,
  BrainCircuit,
  Egg,
  MoreVertical,
  Trash2,
  DollarSign,
  ChevronRight,
  Droplets,
  Scale,
  Camera,
  Image as ImageIcon,
  Eye,
  BarChart3,
  MousePointer2,
  Edit,
  Check,
  ListFilter,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import EggProductionModule from './EggProductionModule';
import { analyzeFlockPerformance } from '../services/geminiService';

interface FlockDetailProps {
  flock: Flock;
  inventoryItems: InventoryItem[];
  customers: Customer[];
  transactions: Transaction[];
  onAddOrder: (order: SalesOrder) => void;
  onBack: () => void;
  onUpdateFlock: (flock: Flock) => void;
  onDeleteFlock: (id: string) => void;
  onUpdateInventory: (item: InventoryItem) => void;
  onAddInventoryItem: (item: InventoryItem) => void;
  onViewHealth: () => void;
  initialTab?: 'OVERVIEW' | 'LOGS' | 'AI' | 'EGG_PROD';
}

// --- Chart Helper Component ---
const PerformanceChart = ({ 
  data, 
  dataKey, 
  labelKey = 'day', 
  color = '#3b82f6', 
  unit = '', 
  title, 
  height = 300,
  showArea = true,
  showMovingAverage = false
}: { 
  data: any[], 
  dataKey: string, 
  labelKey?: string, 
  color?: string, 
  unit?: string, 
  title: string,
  height?: number,
  showArea?: boolean,
  showMovingAverage?: boolean
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dimensions
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };
  const width = 1000; // Internal coordinate system width
  const chartHeight = height; // Internal coordinate system height
  const chartWidth = width;

  const safeData = data || [];

  // Scaling
  const values = safeData.map(d => Number(d[dataKey] || 0));
  const maxVal = Math.max(...values) * 1.1 || 10; // Add 10% headroom
  
  const getX = (index: number) => {
    return padding.left + (index / (safeData.length - 1 || 1)) * (chartWidth - padding.left - padding.right);
  };

  const getY = (value: number) => {
    return chartHeight - padding.bottom - (value / maxVal) * (chartHeight - padding.top - padding.bottom);
  };

  const points = safeData.map((d, i) => ({
    x: getX(i),
    y: getY(Number(d[dataKey] || 0)),
    value: Number(d[dataKey] || 0),
    label: d[labelKey],
    originalData: d
  }));

  // Determine Moving Average Period based on data density
  const maPeriod = useMemo(() => {
    if (!showMovingAverage) return 0;
    if (safeData.length >= 30) return 7; // Weekly avg for daily data
    if (safeData.length >= 10) return 3; // 3-point smooth for sparser data
    return 0;
  }, [safeData.length, showMovingAverage]);

  // Calculate Moving Average Points
  const maPoints = useMemo(() => {
    if (maPeriod === 0) return [];
    
    return points.map((p, i) => {
        if (i < maPeriod - 1) return null;
        const subset = points.slice(i - maPeriod + 1, i + 1);
        const avg = subset.reduce((sum, pt) => sum + pt.value, 0) / maPeriod;
        return {
            x: p.x,
            y: getY(avg),
            value: avg
        };
    }).filter((p): p is {x: number, y: number, value: number} => p !== null);
  }, [points, maPeriod]); // getY is stable enough in render or we assume stability

  // Generate Smooth Path (Catmull-Rom like Bezier)
  const generatePath = (pts: typeof points, close: boolean = false) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${padding.left} ${getY(pts[0].value)} L ${chartWidth - padding.right} ${getY(pts[0].value)}`;

    let d = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    if (close) {
      d += ` L ${pts[pts.length - 1].x} ${chartHeight - padding.bottom} L ${pts[0].x} ${chartHeight - padding.bottom} Z`;
    }

    return d;
  };

  const linePath = generatePath(points);
  const areaPath = generatePath(points, true);
  const maPath = generatePath(maPoints as any);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relX = (x / rect.width) * chartWidth;
    
    // Find nearest point
    let minDist = Infinity;
    let nearestIdx = 0;

    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    });

    setHoverIndex(nearestIdx);
  };

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  if (!data || data.length === 0) {
    return (
      <div className={`w-full bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 text-sm`} style={{ height }}>
         Not enough data to display {title}.
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          {title}
        </h4>
        <div className="flex items-center gap-3">
            {showMovingAverage && maPeriod > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                    <div className="w-3 h-0 border-t-2 border-dashed border-slate-400"></div>
                    {maPeriod}-Period Avg
                </div>
            )}
            <div className="text-xs font-bold px-2 py-1 bg-slate-100 rounded text-slate-600">
              Max: {Math.max(...values).toLocaleString(undefined, { maximumFractionDigits: 1 })} {unit}
            </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full select-none cursor-crosshair"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const y = padding.top + t * (chartHeight - padding.top - padding.bottom);
            const val = maxVal * (1 - t);
            return (
              <g key={t}>
                <line 
                  x1={padding.left} 
                  y1={y} 
                  x2={chartWidth - padding.right} 
                  y2={y} 
                  stroke="#f1f5f9" 
                  strokeWidth="1" 
                  strokeDasharray="4 4"
                />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-medium">
                  {val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Chart Rendering Logic */}
          {showArea && <path d={areaPath} fill={`url(#grad-${title})`} />}
          
          {/* Main Line */}
          <path d={linePath} fill="none" stroke={color} strokeWidth={showArea ? "3" : "3"} strokeLinecap="round" strokeLinejoin="round" />

          {/* Moving Average Line */}
          {showMovingAverage && maPath && (
             <path d={maPath} fill="none" stroke={color} strokeWidth="2" strokeDasharray="5 5" opacity="0.5" />
          )}

          {/* Render Points if Monthly (Sparse Data) or Hovered */}
          {(!showArea || activePoint) && points.map((p, i) => (
             (activePoint === p || !showArea) && (
               <g key={i}>
                 {activePoint === p && (
                   <line 
                     x1={p.x} y1={padding.top} 
                     x2={p.x} y2={chartHeight - padding.bottom} 
                     stroke={color} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" 
                   />
                 )}
                 <circle cx={p.x} cy={p.y} r={activePoint === p ? "6" : "4"} fill="white" stroke={color} strokeWidth="3" />
               </g>
             )
          ))}
          
          {/* X Axis Labels (Sparse) */}
          {points.length > 0 && points.map((p, i) => {
             // Show label if it's the first, last, or every nth point depending on density
             const density = Math.ceil(points.length / 6);
             if (i % density === 0) {
                return (
                   <text key={i} x={p.x} y={chartHeight - 10} textAnchor="middle" className="text-[10px] fill-slate-400 font-medium">
                      {p.label}
                   </text>
                );
             }
             return null;
          })}

        </svg>

        {/* Tooltip Overlay */}
        {activePoint && (
          <div 
            className="absolute z-10 pointer-events-none bg-slate-900/95 backdrop-blur-sm text-white text-xs rounded-lg p-3 shadow-xl border border-slate-700 transform -translate-x-1/2 -translate-y-full transition-all duration-75 min-w-[120px]"
            style={{ 
              left: `${(activePoint.x / chartWidth) * 100}%`, 
              top: `${(activePoint.y / chartHeight) * 100}%`,
              marginTop: '-16px'
            }}
          >
            <div className="text-slate-400 mb-2 font-medium border-b border-slate-700/50 pb-2 flex justify-between items-center gap-4">
                <span>{activePoint.label}</span>
                {activePoint.originalData.date && <span className="text-[10px] opacity-70 bg-slate-800 px-1.5 py-0.5 rounded">{activePoint.originalData.date}</span>}
            </div>
            
            <div className="flex justify-between items-center gap-4 text-sm mb-1">
                <span className="font-medium text-slate-300">Exact Value:</span>
                <span className="font-bold text-white text-base">{activePoint.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">{unit}</span></span>
            </div>

            {/* Show MA in tooltip if enabled and available for this point */}
            {showMovingAverage && maPeriod > 0 && (
                (() => {
                    const idx = points.indexOf(activePoint);
                    if (idx >= maPeriod - 1) {
                         const subset = points.slice(idx - maPeriod + 1, idx + 1);
                         const avg = subset.reduce((sum, pt) => sum + pt.value, 0) / maPeriod;
                         return (
                            <div className="flex justify-between items-center gap-4 text-xs mt-1 pt-1 border-t border-slate-700/50 text-slate-400">
                                <span className="font-medium flex items-center gap-1.5">
                                    <div className="w-3 h-0 border-t-2 border-dashed border-slate-500"></div>
                                    Trend ({maPeriod}d):
                                </span>
                                <span>{avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            </div>
                         );
                    }
                    return null;
                })()
            )}
          </div>
        )}
      </div>
    </div>
  );
};


const FlockDetail: React.FC<FlockDetailProps> = ({
  flock,
  inventoryItems,
  customers,
  transactions,
  onAddOrder,
  onBack,
  onUpdateFlock,
  onDeleteFlock,
  onUpdateInventory,
  onAddInventoryItem,
  onViewHealth,
  initialTab = 'OVERVIEW'
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logFormError, setLogFormError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  // Status Change State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusUpdateData, setStatusUpdateData] = useState<{ status: FlockStatus, clearCount: boolean }>({
    status: flock.status,
    clearCount: false
  });

  // Performance Trend View State
  const [trendViewMode, setTrendViewMode] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');

  // Derived state
  const feedItems = inventoryItems.filter(i => i.category === InventoryCategory.FEED);
  
  // Calculate Flock Age (Date-based)
  const flockAge = useMemo(() => {
    const start = new Date(flock.startDate);
    const today = new Date();
    start.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays) + (flock.initialAgeDays || 0);
  }, [flock.startDate, flock.initialAgeDays]);

  // Financial Metrics Calculation
  const financialMetrics = useMemo(() => {
    const flockTxs = transactions.filter(t => t.flockId === flock.id);
    
    let totalRevenue = 0;
    let totalExpenses = 0;

    flockTxs.forEach(t => {
      if (t.type === 'INCOME') {
        totalRevenue += t.amount;
      } else if (t.type === 'EXPENSE') {
        totalExpenses += t.amount;
      }
    });

    const netProfit = totalRevenue - totalExpenses;
    
    return {
      totalRevenue,
      totalExpenses,
      netProfit
    };
  }, [transactions, flock.id]);

  // Log Form State
  const [logFormData, setLogFormData] = useState<{
    date: string;
    mortality: number;
    mortalityReason: string;
    feedConsumedKg: number;
    selectedFeedId: string;
    waterConsumedL: number;
    avgWeightG: number;
    eggProduction: number;
    eggsDamaged: number;
    notes: string;
    mortalityImage: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    mortality: 0,
    mortalityReason: '',
    feedConsumedKg: 0,
    selectedFeedId: '',
    waterConsumedL: 0,
    avgWeightG: 0,
    eggProduction: 0,
    eggsDamaged: 0,
    notes: '',
    mortalityImage: ''
  });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Aggregated Data Calculation for Charts
  const chartData = useMemo(() => {
    const sortedLogs = [...flock.logs].sort((a, b) => a.day - b.day);
    
    // Variables for cumulative calculation
    let cumFeed = 0;
    let cumMortality = 0;

    // Enhance logs with derived metrics
    const enhancedLogs = sortedLogs.map(log => {
      cumFeed += log.feedConsumedKg;
      
      const currentPop = flock.initialCount - cumMortality; // Birds alive at START of day
      cumMortality += log.mortality; // Update cumulative mortality for next iteration
      
      const birdsEndDay = currentPop - log.mortality;
      
      // FCR = Cumulative Feed / Total Live Biomass
      // Biomass = Current Bird Count * Avg Weight
      const biomassKg = (birdsEndDay * log.avgWeightG) / 1000;
      const fcr = biomassKg > 0 ? cumFeed / biomassKg : 0;

      // Mortality Rate (Daily) = (Deaths / Start Population) * 100
      const mortRate = currentPop > 0 ? (log.mortality / currentPop) * 100 : 0;

      return {
        ...log,
        fcr,
        mortalityRate: mortRate,
        label: `Day ${log.day}`
      };
    });

    if (trendViewMode === 'DAILY') {
        return enhancedLogs;
    }

    // Grouping Logic for Weekly/Monthly
    const groupedData = new Map<string, typeof enhancedLogs>();

    enhancedLogs.forEach(log => {
      const date = new Date(log.date);
      let key = '';
      
      if (trendViewMode === 'WEEKLY') {
         const start = new Date(flock.startDate);
         const diff = date.getTime() - start.getTime();
         const weekNum = Math.floor(diff / (1000 * 60 * 60 * 24 * 7)) + 1;
         key = `Week ${weekNum}`;
      } else {
         key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      }

      if (!groupedData.has(key)) {
          groupedData.set(key, []);
      }
      groupedData.get(key)?.push(log);
    });

    // Aggregate grouped data
    return Array.from(groupedData.entries()).map(([label, logs]) => {
       const lastLog = logs[logs.length - 1]; // For cumulative metrics like FCR, date
       
       const totalMortality = logs.reduce((sum, l) => sum + l.mortality, 0);
       const totalEggs = logs.reduce((sum, l) => sum + (l.eggProduction || 0), 0);
       const avgWeight = logs.reduce((sum, l) => sum + l.avgWeightG, 0) / (logs.length || 1);
       
       // Average the daily mortality rates for the period trend
       const avgMortRate = logs.reduce((sum, l) => sum + l.mortalityRate, 0) / (logs.length || 1);

       return {
          label,
          date: lastLog.date,
          mortality: totalMortality,
          eggProduction: totalEggs,
          avgWeightG: avgWeight,
          fcr: lastLog.fcr, // Use cumulative FCR at end of period
          mortalityRate: avgMortRate
       };
    });
  }, [flock.logs, flock.startDate, trendViewMode, flock.initialCount]);

  const handleRunAnalysis = async () => {
    setIsLoadingAi(true);
    const result = await analyzeFlockPerformance(flock);
    setAiAnalysis(result);
    setIsLoadingAi(false);
  };

  const handleStatusUpdate = () => {
    const updated = { ...flock, status: statusUpdateData.status };
    if (updated.status === FlockStatus.HARVESTED && statusUpdateData.clearCount) {
        updated.currentCount = 0;
    }
    onUpdateFlock(updated);
    setIsStatusModalOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogFormData(prev => ({ ...prev, mortalityImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    setLogFormError(null);

    // Handle Stock Deduction (Feed)
    if (logFormData.selectedFeedId && logFormData.feedConsumedKg > 0) {
        const feedItem = inventoryItems.find(i => i.id === logFormData.selectedFeedId);
        if (feedItem) {
            let deductionAmount = logFormData.feedConsumedKg;
            const isBagUnit = feedItem.unit.toLowerCase().includes('bag');
            
            // If inventory is in Bags, convert the consumed Kg to Bags (1 Bag = 50kg)
            if (isBagUnit) {
                deductionAmount = logFormData.feedConsumedKg / 50;
            }

            if (feedItem.quantity < deductionAmount) {
                setLogFormError(`Insufficient stock for ${feedItem.name}. Available: ${feedItem.quantity} ${feedItem.unit} (Need ${deductionAmount.toFixed(2)} ${feedItem.unit})`);
                return;
            }
            
            onUpdateInventory({
                ...feedItem,
                quantity: feedItem.quantity - deductionAmount,
                lastUpdated: new Date().toISOString().split('T')[0]
            });
        }
    }

    // Handle Egg Production Inventory Update
    if (flock.type === BirdType.LAYER && Number(logFormData.eggProduction) > 0) {
        const produced = Number(logFormData.eggProduction);
        const damaged = Number(logFormData.eggsDamaged) || 0;
        const netSaleable = Math.max(0, produced - damaged);

        if (netSaleable > 0) {
            // Find existing Table Eggs item or create one
            const eggItem = inventoryItems.find(i => 
                i.name === 'Table Eggs' || 
                (i.category === InventoryCategory.OTHER && i.name.toLowerCase().includes('egg'))
            );

            if (eggItem) {
                onUpdateInventory({
                    ...eggItem,
                    quantity: eggItem.quantity + netSaleable,
                    lastUpdated: new Date().toISOString().split('T')[0]
                });
            } else {
                // Auto-create inventory item for eggs if it doesn't exist
                onAddInventoryItem({
                    id: `inv-eggs-${Date.now()}`,
                    name: 'Table Eggs',
                    category: InventoryCategory.OTHER,
                    quantity: netSaleable,
                    unit: 'units',
                    minLevel: 100, // Default alert level
                    costPerUnit: 0.15, // Default estimated value
                    lastUpdated: new Date().toISOString().split('T')[0],
                    notes: 'Auto-created from daily production logs.'
                });
            }
        }
    }

    const newLog: DailyLog = {
      day: flock.logs.length + 1, // Sequential
      date: logFormData.date,
      mortality: Number(logFormData.mortality),
      mortalityReason: logFormData.mortalityReason,
      feedConsumedKg: Number(logFormData.feedConsumedKg),
      waterConsumedL: Number(logFormData.waterConsumedL),
      avgWeightG: Number(logFormData.avgWeightG),
      eggProduction: Number(logFormData.eggProduction),
      eggDetails: flock.type === BirdType.LAYER ? {
         morning: { good: { large: 0, medium: 0, small: 0}, damaged: 0 },
         afternoon: { good: { large: 0, medium: 0, small: 0}, damaged: Number(logFormData.eggsDamaged) }
      } : undefined,
      notes: logFormData.notes,
      mortalityImage: logFormData.mortalityImage
    };

    const updatedFlock = {
      ...flock,
      currentCount: Math.max(0, flock.currentCount - newLog.mortality),
      logs: [...flock.logs, newLog]
    };

    onUpdateFlock(updatedFlock);
    setIsLogModalOpen(false);
    
    setLogFormData({
        date: new Date().toISOString().split('T')[0],
        mortality: 0,
        mortalityReason: '',
        feedConsumedKg: 0,
        selectedFeedId: '',
        waterConsumedL: 0,
        avgWeightG: 0,
        eggProduction: 0,
        eggsDamaged: 0,
        notes: '',
        mortalityImage: ''
    });
  };

  const recentLogs = [...flock.logs].reverse();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
            >
               <ArrowLeft size={20} />
            </button>
            <div>
               <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                 {flock.name} 
                 <button 
                    onClick={() => {
                        setStatusUpdateData({ status: flock.status, clearCount: false });
                        setIsStatusModalOpen(true);
                    }}
                    className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer ${
                        flock.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 
                        flock.status === 'Quarantine' ? 'bg-red-100 text-red-700 border-red-200' :
                        flock.status === 'Harvested' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        'bg-blue-100 text-blue-700 border-blue-200'
                    }`}
                    title="Change Status"
                 >
                   {flock.status} <Edit size={10} />
                 </button>
               </h1>
               <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                  <span>Batch: {flock.batchId}</span>
                  <span>•</span>
                  <span>{flock.breed}</span>
                  <span>•</span>
                  <span>Started: {flock.startDate}</span>
               </div>
            </div>
         </div>
         <div className="flex gap-2">
            <button 
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} /> Delete
            </button>
            <button 
              onClick={() => setIsLogModalOpen(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Daily Log
            </button>
         </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
         <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab('OVERVIEW')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'OVERVIEW' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
               <Activity size={16} /> Overview
            </button>
            <button 
              onClick={() => setActiveTab('LOGS')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'LOGS' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
               <FileText size={16} /> Daily Logs
            </button>
            {flock.type === BirdType.LAYER && (
                <button 
                  onClick={() => setActiveTab('EGG_PROD')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'EGG_PROD' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                   <Egg size={16} /> Production
                </button>
            )}
            <button 
              onClick={() => setActiveTab('AI')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'AI' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
               <BrainCircuit size={16} /> AI Insights
            </button>
         </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
         {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Population</p>
                     <h3 className="text-2xl font-bold text-slate-900 mt-1">{flock.currentCount.toLocaleString()}</h3>
                     <p className="text-xs text-red-500 mt-1">{flock.initialCount - flock.currentCount} mortality total</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Profit/Loss</p>
                     <h3 className={`text-2xl font-bold mt-1 ${financialMetrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${financialMetrics.netProfit.toLocaleString()}
                     </h3>
                     <div className="flex justify-between items-center text-xs mt-1 text-slate-500">
                        <span className="flex items-center gap-1 text-green-600"><ArrowUpRight size={10}/> ${financialMetrics.totalRevenue.toLocaleString()}</span>
                        <span className="flex items-center gap-1 text-red-600"><ArrowDownRight size={10}/> ${financialMetrics.totalExpenses.toLocaleString()}</span>
                     </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Feed Consumed</p>
                     <h3 className="text-2xl font-bold text-slate-900 mt-1">
                        {flock.logs.reduce((acc, l) => acc + (l.feedConsumedKg || 0), 0).toLocaleString()} <span className="text-sm font-medium">kg</span>
                     </h3>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">FCR (Est.)</p>
                     <h3 className="text-2xl font-bold text-blue-600 mt-1">
                        {flock.logs.length > 0 && flock.logs[flock.logs.length-1].avgWeightG > 0
                           ? ((flock.logs.reduce((acc, l) => acc + (l.feedConsumedKg || 0), 0) * 1000) / (flock.currentCount * flock.logs[flock.logs.length-1].avgWeightG)).toFixed(2)
                           : '-'
                        }
                     </h3>
                     <p className="text-xs text-slate-400 mt-1">Feed Conversion Ratio</p>
                  </div>
               </div>

               {/* Quick Actions */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                     <h3 className="font-bold text-blue-900 mb-2">Health & Veterinary</h3>
                     <p className="text-sm text-blue-700 mb-4">View medical records, schedule vaccinations, or report health issues for this flock.</p>
                     <button 
                       onClick={onViewHealth}
                       className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                     >
                        Manage Health
                     </button>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                     <h3 className="font-bold text-slate-900 mb-2">Recent Notes</h3>
                     <div className="space-y-2 max-h-32 overflow-y-auto">
                        {flock.logs.slice(-3).reverse().map(log => (
                           <div key={log.day} className="text-sm text-slate-600 border-l-2 border-slate-300 pl-3">
                              <span className="font-bold text-xs text-slate-400 block">Day {log.day} ({log.date})</span>
                              {log.notes || 'No notes.'}
                           </div>
                        ))}
                        {flock.logs.length === 0 && <span className="text-sm text-slate-400 italic">No logs recorded yet.</span>}
                     </div>
                  </div>
               </div>

               {/* Performance Trends Section */}
               <div>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                         <TrendingUp size={24} className="text-primary-600" /> Performance Trends
                      </h3>
                      {/* View Toggle */}
                      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                          {['DAILY', 'WEEKLY', 'MONTHLY'].map(mode => (
                              <button 
                                key={mode}
                                onClick={() => setTrendViewMode(mode as any)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                    trendViewMode === mode 
                                    ? 'bg-white text-slate-900 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                              >
                                  {mode.charAt(0) + mode.slice(1).toLowerCase()}
                              </button>
                          ))}
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* Weight / Egg Production Chart */}
                     <PerformanceChart 
                       title={flock.type === BirdType.LAYER ? "Egg Production" : "Avg Weight"}
                       data={chartData}
                       dataKey={flock.type === BirdType.LAYER ? "eggProduction" : "avgWeightG"}
                       labelKey="label"
                       unit={flock.type === BirdType.LAYER ? "eggs" : "g"}
                       color={flock.type === BirdType.LAYER ? "#eab308" : "#3b82f6"} 
                       showArea={trendViewMode !== 'MONTHLY'} // Line graph only for Monthly
                       showMovingAverage={trendViewMode === 'DAILY' || trendViewMode === 'WEEKLY'} // Enable MA for daily/weekly trends
                     />

                     {/* Mortality Rate Chart (Calculated Daily %) */}
                     <PerformanceChart 
                       title="Daily Mortality Rate"
                       data={chartData}
                       dataKey="mortalityRate"
                       labelKey="label"
                       unit="%"
                       color="#ef4444" 
                       showArea={true} 
                       showMovingAverage={trendViewMode === 'DAILY'}
                     />

                     {/* FCR Chart (Cumulative Feed / Cumulative Weight) */}
                     <PerformanceChart 
                       title="FCR (Cumulative)"
                       data={chartData}
                       dataKey="fcr"
                       labelKey="label"
                       unit=""
                       color="#8b5cf6" 
                       showArea={false} 
                       showMovingAverage={false} // FCR is typically smoothed or cumulative already
                     />

                     {/* Total Mortality Volume Chart */}
                     <PerformanceChart 
                       title="Mortality Count"
                       data={chartData}
                       dataKey="mortality"
                       labelKey="label"
                       unit="birds"
                       color="#f97316" 
                       showArea={trendViewMode !== 'MONTHLY'} 
                       showMovingAverage={trendViewMode === 'DAILY'} 
                     />
                  </div>
               </div>
            </div>
         )}

         {activeTab === 'LOGS' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                           <th className="px-6 py-4">Day</th>
                           <th className="px-6 py-4">Date</th>
                           <th className="px-6 py-4">Mortality</th>
                           <th className="px-6 py-4">Feed (kg)</th>
                           <th className="px-6 py-4">Water (L)</th>
                           <th className="px-6 py-4">Weight (g)</th>
                           {flock.type === BirdType.LAYER && <th className="px-6 py-4">Eggs</th>}
                           <th className="px-6 py-4">Notes</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {recentLogs.map(log => (
                           <tr key={log.day} className="hover:bg-slate-50">
                              <td className="px-6 py-4 font-bold text-slate-700">{log.day}</td>
                              <td className="px-6 py-4 text-slate-600">{log.date}</td>
                              <td className="px-6 py-4 text-red-600 font-medium">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      {log.mortality > 0 ? log.mortality : '-'}
                                      {log.mortalityImage && (
                                        <button 
                                          onClick={() => setViewProofUrl(log.mortalityImage || null)}
                                          className="text-slate-400 hover:text-blue-600 transition-colors p-1 hover:bg-blue-50 rounded"
                                          title="View Mortality Proof"
                                        >
                                          <ImageIcon size={16} />
                                        </button>
                                      )}
                                    </div>
                                    {log.mortality > 0 && log.mortalityReason && (
                                        <span className="text-[10px] text-slate-500 font-normal italic leading-tight mt-0.5">
                                            {log.mortalityReason}
                                        </span>
                                    )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-600">{log.feedConsumedKg}</td>
                              <td className="px-6 py-4 text-slate-600">{log.waterConsumedL}</td>
                              <td className="px-6 py-4 text-slate-600">{log.avgWeightG}</td>
                              {flock.type === BirdType.LAYER && (
                                <td className="px-6 py-4 text-yellow-600 font-medium">{log.eggProduction || '-'}</td>
                              )}
                              <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{log.notes || '-'}</td>
                           </tr>
                        ))}
                        {recentLogs.length === 0 && (
                           <tr>
                              <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                 No logs found. Start by adding a daily log.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         )}

         {activeTab === 'EGG_PROD' && (
             <EggProductionModule 
                flock={flock} 
                inventoryItems={inventoryItems} 
                onRequestRecord={() => setIsLogModalOpen(true)} 
             />
         )}

         {activeTab === 'AI' && (
            <div className="space-y-6">
               <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-8 text-white shadow-lg">
                  <div className="flex items-start gap-4 mb-6">
                     <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                        <BrainCircuit size={32} />
                     </div>
                     <div>
                        <h2 className="text-2xl font-bold">AI Performance Analyst</h2>
                        <p className="text-purple-100 mt-1 max-w-xl">
                           Leverage Gemini AI to analyze your flock's growth patterns, mortality risks, and feed conversion efficiency.
                        </p>
                     </div>
                  </div>
                  
                  {!aiAnalysis ? (
                     <button 
                       onClick={handleRunAnalysis}
                       disabled={isLoadingAi}
                       className="bg-white text-purple-700 px-6 py-3 rounded-lg font-bold hover:bg-purple-50 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait flex items-center gap-2"
                     >
                        {isLoadingAi ? 'Analyzing Data...' : 'Generate Analysis Report'}
                     </button>
                  ) : (
                     <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold flex items-center gap-2"><Activity size={18}/> Analysis Result</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                aiAnalysis.alertLevel === 'HIGH' ? 'bg-red-500/20 border-red-400 text-red-100' :
                                aiAnalysis.alertLevel === 'MEDIUM' ? 'bg-yellow-500/20 border-yellow-400 text-yellow-100' :
                                'bg-green-500/20 border-green-400 text-green-100'
                            }`}>
                                Risk Level: {aiAnalysis.alertLevel}
                            </span>
                        </div>
                        <p className="mb-4 leading-relaxed opacity-90">{aiAnalysis.analysis}</p>
                        
                        <h4 className="font-bold text-sm uppercase tracking-wider opacity-70 mb-2">Recommendations</h4>
                        <ul className="space-y-2">
                           {aiAnalysis.recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm bg-white/5 p-2 rounded">
                                 <ChevronRight size={14} className="mt-0.5 shrink-0" /> {rec}
                              </li>
                           ))}
                        </ul>

                        <button 
                          onClick={() => setAiAnalysis(null)}
                          className="mt-6 text-sm underline opacity-70 hover:opacity-100"
                        >
                           Clear and run new analysis
                        </button>
                     </div>
                  )}
               </div>
            </div>
         )}
      </div>

      {/* Status Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                 <h3 className="font-bold text-lg text-slate-900">Update Flock Status</h3>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Status</label>
                    <select 
                      value={statusUpdateData.status}
                      onChange={(e) => setStatusUpdateData({...statusUpdateData, status: e.target.value as FlockStatus})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                       <option value={FlockStatus.ACTIVE}>Active</option>
                       <option value={FlockStatus.HARVESTED}>Harvested</option>
                       <option value={FlockStatus.QUARANTINE}>Quarantine</option>
                       <option value={FlockStatus.PLANNED}>Planned</option>
                    </select>
                 </div>

                 {statusUpdateData.status === FlockStatus.HARVESTED && (
                     <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                         <input 
                           type="checkbox" 
                           id="clearCount"
                           checked={statusUpdateData.clearCount}
                           onChange={(e) => setStatusUpdateData({...statusUpdateData, clearCount: e.target.checked})}
                           className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                         />
                         <label htmlFor="clearCount" className="text-sm text-slate-700 cursor-pointer select-none">
                             <span className="font-bold block text-blue-900">Clear Live Bird Count?</span>
                             Sets population to 0. Use this if all birds have been sold or removed.
                         </label>
                     </div>
                 )}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                 <button 
                   onClick={() => setIsStatusModalOpen(false)}
                   className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                   >
                   Cancel
                 </button>
                 <button 
                   onClick={handleStatusUpdate}
                   className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2"
                 >
                   <Check size={16} /> Update Status
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Log Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                 <h3 className="font-bold text-lg text-slate-900">Add Daily Log - Day {flock.logs.length + 1}</h3>
                 <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                   <X size={20} />
                 </button>
              </div>
              
              <form onSubmit={handleAddLog} className="p-6 space-y-4">
                 {logFormError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200 flex items-start gap-2">
                       <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                       {logFormError}
                    </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                       <input 
                         type="date" 
                         required
                         value={logFormData.date}
                         onChange={e => setLogFormData({...logFormData, date: e.target.value})}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Mortality</label>
                       <input 
                         type="number" 
                         min="0"
                         value={logFormData.mortality}
                         onChange={e => setLogFormData({...logFormData, mortality: Number(e.target.value)})}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                       />
                    </div>
                 </div>

                 {logFormData.mortality > 0 && (
                     <div className="space-y-4 p-3 bg-red-50 rounded-lg border border-red-100">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Mortality</label>
                            <input 
                              type="text" 
                              value={logFormData.mortalityReason}
                              onChange={e => setLogFormData({...logFormData, mortalityReason: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="e.g. Sickness, Injury"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Upload Proof (Optional)</label>
                            <div className="flex items-center gap-3">
                                <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 flex items-center gap-2 transition-colors">
                                    <Camera size={16} />
                                    {logFormData.mortalityImage ? 'Change Image' : 'Select Image'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                                {logFormData.mortalityImage && (
                                    <div className="relative w-10 h-10 rounded overflow-hidden border border-slate-300">
                                        <img src={logFormData.mortalityImage} alt="Proof" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>
                     </div>
                 )}

                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                           <Scale size={16} /> Feed Consumed (kg)
                        </label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.01"
                          value={logFormData.feedConsumedKg}
                          onChange={e => setLogFormData({...logFormData, feedConsumedKg: Number(e.target.value)})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Deduct from Inventory?</label>
                        <select 
                          value={logFormData.selectedFeedId}
                          onChange={e => setLogFormData({...logFormData, selectedFeedId: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                           <option value="">Do not deduct</option>
                           {feedItems.map(item => (
                              <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>
                           ))}
                        </select>
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                          <Droplets size={16} /> Water (L)
                       </label>
                       <input 
                         type="number" 
                         min="0"
                         value={logFormData.waterConsumedL}
                         onChange={e => setLogFormData({...logFormData, waterConsumedL: Number(e.target.value)})}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Avg Weight (g)</label>
                       <input 
                         type="number" 
                         min="0"
                         value={logFormData.avgWeightG}
                         onChange={e => setLogFormData({...logFormData, avgWeightG: Number(e.target.value)})}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                       />
                    </div>
                 </div>

                 {flock.type === BirdType.LAYER && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 space-y-4">
                       <div>
                          <label className="block text-sm font-bold text-yellow-800 mb-1 flex items-center gap-2">
                             <Egg size={16} /> Egg Production
                          </label>
                          <input 
                            type="number" 
                            min="0"
                            value={logFormData.eggProduction}
                            onChange={e => setLogFormData({...logFormData, eggProduction: Number(e.target.value)})}
                            className="w-full px-3 py-2 border border-yellow-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500"
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-yellow-800 mb-1">Damaged / Rejected</label>
                          <input 
                            type="number" 
                            min="0"
                            value={logFormData.eggsDamaged}
                            onChange={e => setLogFormData({...logFormData, eggsDamaged: Number(e.target.value)})}
                            className="w-full px-3 py-2 border border-yellow-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500"
                          />
                       </div>
                    </div>
                 )}

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea 
                       rows={2}
                       value={logFormData.notes}
                       onChange={e => setLogFormData({...logFormData, notes: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                 </div>

                 <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsLogModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2">
                      <Save size={18} /> Save Log
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* View Proof Image Modal */}
      {viewProofUrl && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewProofUrl(null)}>
           <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setViewProofUrl(null)}
                className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors"
              >
                <X size={32} />
              </button>
              <img src={viewProofUrl} alt="Mortality Proof" className="max-w-full max-h-[80vh] rounded-lg shadow-2xl border border-slate-700" />
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <Trash2 size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Delete Flock?</h3>
              <p className="text-slate-500 text-sm mb-6">
                 Are you sure you want to delete <strong>{flock.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                 <button 
                   onClick={() => setIsDeleteConfirmOpen(false)}
                   className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={() => onDeleteFlock(flock.id)}
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

export default FlockDetail;