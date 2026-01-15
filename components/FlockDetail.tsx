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
  ArrowDownRight,
  Loader2,
  Stethoscope,
  Wheat,
  PackageCheck,
  Package
} from 'lucide-react';
import EggProductionModule from './EggProductionModule';
import { analyzeFlockPerformance, diagnoseBirdHealth } from '../services/geminiService';

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
  height = 250,
  type = 'line',
  showMovingAverage = false
}: { 
  data: any[], 
  dataKey: string, 
  labelKey?: string, 
  color?: string, 
  unit?: string, 
  title: string,
  height?: number,
  type?: 'line' | 'bar' | 'area',
  showMovingAverage?: boolean
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dimensions
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };
  const width = 800; // Internal coordinate system width
  const chartHeight = height; 
  const chartWidth = width;

  const safeData = data || [];

  // Scaling
  const values = safeData.map(d => Number(d[dataKey] || 0));
  const maxVal = Math.max(...values, 1) * 1.1;
  
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

  // Moving Average
  const maPeriod = showMovingAverage ? (safeData.length >= 20 ? 7 : 3) : 0;
  const maPoints = useMemo(() => {
    if (maPeriod === 0) return [];
    return points.map((p, i) => {
        if (i < maPeriod - 1) return null;
        const subset = points.slice(i - maPeriod + 1, i + 1);
        const avg = subset.reduce((sum, pt) => sum + pt.value, 0) / maPeriod;
        return { x: p.x, y: getY(avg), value: avg };
    }).filter((p): p is {x: number, y: number, value: number} => p !== null);
  }, [points, maPeriod]); 

  // Path Generation
  const generateLinePath = (pts: typeof points, close: boolean = false) => {
    if (pts.length === 0) return "";
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relX = (x / rect.width) * chartWidth;
    
    let minDist = Infinity;
    let nearestIdx = 0;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < minDist) { minDist = dist; nearestIdx = i; }
    });
    setHoverIndex(nearestIdx);
  };

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  if (safeData.length === 0) return <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>;

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          {title}
        </h4>
        <div className="text-xs font-bold px-2 py-1 bg-slate-100 rounded text-slate-600">
           {Math.max(...values).toLocaleString()} {unit} Max
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full flex-1 select-none cursor-crosshair"
        style={{ minHeight: height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const y = padding.top + t * (chartHeight - padding.top - padding.bottom);
            const val = maxVal * (1 - t);
            return (
              <g key={t}>
                <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <text x={padding.left - 8} y={y + 3} textAnchor="end" className="text-[10px] fill-slate-400 font-medium">{val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toFixed(0)}</text>
              </g>
            );
          })}

          {/* Visualization Type */}
          {type === 'bar' ? (
             points.map((p, i) => {
                const barWidth = (chartWidth - padding.left - padding.right) / points.length * 0.6;
                const barHeight = (chartHeight - padding.bottom) - p.y;
                return (
                   <rect 
                     key={i} 
                     x={p.x - barWidth/2} 
                     y={p.y} 
                     width={barWidth} 
                     height={barHeight} 
                     fill={color} 
                     opacity={activePoint === p ? 1 : 0.7}
                     rx={2}
                   />
                );
             })
          ) : (
             <>
                {type === 'area' && (
                    <path d={generateLinePath(points, true)} fill={color} fillOpacity="0.1" />
                )}
                <path d={generateLinePath(points)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {showMovingAverage && maPoints.length > 0 && (
                    <path d={generateLinePath(maPoints as any)} fill="none" stroke={color} strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
                )}
             </>
          )}

          {/* Hover Indicator */}
          {activePoint && type !== 'bar' && (
             <g>
               <line x1={activePoint.x} y1={padding.top} x2={activePoint.x} y2={chartHeight - padding.bottom} stroke={color} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
               <circle cx={activePoint.x} cy={activePoint.y} r="5" fill="white" stroke={color} strokeWidth="2" />
             </g>
          )}
          
          {/* Axis Labels */}
          {points.length > 0 && points.map((p, i) => {
             if (i % Math.ceil(points.length / 6) === 0) {
                return <text key={i} x={p.x} y={chartHeight - 10} textAnchor="middle" className="text-[10px] fill-slate-400 font-medium">{p.label}</text>;
             }
             return null;
          })}
        </svg>

        {activePoint && (
          <div 
            className="absolute z-10 pointer-events-none bg-slate-900/95 text-white text-xs rounded-lg p-2 shadow-xl border border-slate-700 transform -translate-x-1/2 -translate-y-full min-w-[100px] text-center"
            style={{ left: `${(activePoint.x / chartWidth) * 100}%`, top: `${(activePoint.y / chartHeight) * 100}%`, marginTop: '-12px' }}
          >
            <div className="font-bold">{activePoint.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-[10px] font-normal opacity-70">{unit}</span></div>
            <div className="text-[9px] text-slate-400 mt-0.5">{activePoint.originalData.date || activePoint.label}</div>
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
  const [isDiagnosing, setIsDiagnosing] = useState(false); // For image diagnosis
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  // Status Change State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusUpdateData, setStatusUpdateData] = useState<{ status: FlockStatus, clearCount: boolean }>({
    status: flock.status,
    clearCount: false
  });

  const feedItems = useMemo(() => {
    return inventoryItems.filter(i => 
      i.category === InventoryCategory.FEED && 
      (!i.targetBirdType || i.targetBirdType === flock.type)
    );
  }, [inventoryItems, flock.type]);
  
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

  // --- Advanced Data Processing Engine ---
  const { chartData, metrics } = useMemo(() => {
    const sortedLogs = [...flock.logs].sort((a, b) => a.day - b.day);
    
    let cumMortality = 0;
    
    // Process Logs
    const processed = sortedLogs.map(log => {
        // Population at START of day (before today's mortality)
        const startOfDayPop = flock.initialCount - cumMortality;
        
        // Update cumulative for next day
        cumMortality += log.mortality;
        
        // Metrics
        const dailyMortalityRate = startOfDayPop > 0 ? (log.mortality / startOfDayPop) * 100 : 0;
        const cumulativeMortalityRate = flock.initialCount > 0 ? (cumMortality / flock.initialCount) * 100 : 0;
        const henDayPct = startOfDayPop > 0 ? ((log.eggProduction || 0) / startOfDayPop) * 100 : 0;
        
        return {
            ...log,
            label: `Day ${log.day}`,
            startOfDayPop,
            cumulativeMortality: cumMortality,
            dailyMortalityRate,
            cumulativeMortalityRate,
            henDayPct
        };
    });

    // Current Snapshot Metrics (Latest Log)
    const latest = (processed[processed.length - 1] || {}) as any;
    const last7Days = processed.slice(-7);
    
    const currentMetrics = {
        currentPop: flock.currentCount,
        dailyProduction: latest.eggProduction || 0,
        avgWeight: latest.avgWeightG || 0,
        henDayPct: latest.henDayPct || 0,
        mortalityRate: latest.cumulativeMortalityRate || 0,
        avgHenDay7d: last7Days.length > 0 ? last7Days.reduce((a,b) => a + b.henDayPct, 0) / last7Days.length : 0
    };

    return { chartData: processed, metrics: currentMetrics };
  }, [flock]);

  const handleRunAnalysis = async () => {
    setIsLoadingAi(true);
    const result = await analyzeFlockPerformance(flock);
    setAiAnalysis(result);
    setIsLoadingAi(false);
  };

  const handleDiagnoseImage = async () => {
    if (!logFormData.mortalityImage) return;
    setIsDiagnosing(true);
    try {
        const result = await diagnoseBirdHealth(logFormData.mortalityImage);
        setLogFormData(prev => ({
            ...prev,
            mortalityReason: result.analysis.substring(0, 100) + '...', // Shorten for input
            notes: (prev.notes + '\n\nAI Diagnosis:\n' + result.analysis + '\n\nRecommendations:\n' + result.recommendations.join(', ')).trim()
        }));
    } catch (e) {
        console.error(e);
        setLogFormError("Failed to diagnose image.");
    } finally {
        setIsDiagnosing(false);
    }
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

    // 1. Inventory Deduction (Feed)
    if (logFormData.selectedFeedId && logFormData.feedConsumedKg > 0) {
        const feedItem = inventoryItems.find(i => i.id === logFormData.selectedFeedId);
        if (feedItem) {
            let deductionAmount = logFormData.feedConsumedKg;
            const isBagUnit = feedItem.unit.toLowerCase().includes('bag');
            if (isBagUnit) deductionAmount = logFormData.feedConsumedKg / 50; // Assuming 50kg bags

            if (feedItem.quantity < deductionAmount) {
                setLogFormError(`Insufficient stock for ${feedItem.name}.`);
                return;
            }
            onUpdateInventory({ ...feedItem, quantity: feedItem.quantity - deductionAmount, lastUpdated: new Date().toISOString().split('T')[0] });
        }
    }

    // 2. Inventory Addition (Egg Production) - Automated Linking
    if (flock.type === BirdType.LAYER) {
        const totalEggs = Number(logFormData.eggProduction);
        const damaged = Number(logFormData.eggsDamaged);
        const netStockable = Math.max(0, totalEggs - damaged);

        if (netStockable > 0) {
            // Find existing 'Table Eggs' or generic 'Eggs' inventory item
            const eggItem = inventoryItems.find(i => 
                i.name.toLowerCase().includes('table egg') || 
                (i.name.toLowerCase() === 'eggs' && i.category === InventoryCategory.OTHER)
            );

            if (eggItem) {
                onUpdateInventory({
                    ...eggItem,
                    quantity: eggItem.quantity + netStockable,
                    lastUpdated: new Date().toISOString().split('T')[0]
                });
            } else {
                console.warn("Automated stock update skipped: No 'Table Eggs' inventory item found.");
            }
        }
    }

    // 3. New Log Creation
    const newLog: DailyLog = {
      day: flock.logs.length + 1,
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
        mortality: 0, mortalityReason: '', feedConsumedKg: 0, selectedFeedId: '', waterConsumedL: 0, avgWeightG: 0, eggProduction: 0, eggsDamaged: 0, notes: '', mortalityImage: ''
    });
  };

  const recentLogs = [...flock.logs].reverse();

  // Find selected feed item details for display
  const selectedFeed = inventoryItems.find(i => i.id === logFormData.selectedFeedId);

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
                        'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
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
              <Trash2 size={16} />
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
               <Activity size={16} /> Performance
            </button>
            <button 
              onClick={() => setActiveTab('LOGS')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'LOGS' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
               <FileText size={16} /> Logs
            </button>
            {flock.type === BirdType.LAYER && (
                <button 
                  onClick={() => setActiveTab('EGG_PROD')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'EGG_PROD' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                   <Egg size={16} /> Eggs
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
               {/* KPI Cards */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daily Production</p>
                     <h3 className="text-2xl font-bold text-slate-900 mt-1">
                        {flock.type === BirdType.LAYER 
                            ? `${metrics.dailyProduction.toLocaleString()} eggs` 
                            : `${metrics.avgWeight.toLocaleString()} g`
                        }
                     </h3>
                     <p className="text-xs text-slate-400 mt-1">Latest log entry</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {flock.type === BirdType.LAYER ? 'Hen-Day %' : 'Feed Conversion'}
                     </p>
                     <h3 className={`text-2xl font-bold mt-1 ${metrics.henDayPct > 90 ? 'text-green-600' : 'text-blue-600'}`}>
                        {flock.type === BirdType.LAYER 
                            ? `${metrics.henDayPct.toFixed(1)}%` 
                            : '-' // FCR Logic placeholder
                        }
                     </h3>
                     <p className="text-xs text-slate-400 mt-1">
                        {flock.type === BirdType.LAYER ? `7-Day Avg: ${metrics.avgHenDay7d.toFixed(1)}%` : 'Ratio'}
                     </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mortality Rate</p>
                     <h3 className={`text-2xl font-bold mt-1 ${metrics.mortalityRate > 5 ? 'text-red-600' : 'text-slate-900'}`}>
                        {metrics.mortalityRate.toFixed(2)}%
                     </h3>
                     <p className="text-xs text-slate-400 mt-1">Cumulative loss</p>
                  </div>

                  {/* Feed Availability Widget - New Feature */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Feed Available</p>
                     <div className="mt-2 space-y-1">
                        {feedItems.length > 0 ? feedItems.slice(0, 2).map(f => (
                            <div key={f.id} className="flex justify-between items-center text-sm">
                                <span className="text-slate-600 truncate max-w-[100px]">{f.name}</span>
                                <span className={`font-bold ${f.quantity <= f.minLevel ? 'text-red-600' : 'text-slate-900'}`}>
                                    {f.quantity.toLocaleString()} {f.unit}
                                </span>
                            </div>
                        )) : <div className="text-sm text-slate-400">No compatible feed</div>}
                        {feedItems.length > 2 && (
                            <div className="text-[10px] text-primary-600 pt-1">+ {feedItems.length - 2} more</div>
                        )}
                     </div>
                  </div>
               </div>

               {/* Main Charts Row */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   {/* Production vs Age Curve */}
                   <PerformanceChart 
                       title={flock.type === BirdType.LAYER ? "Egg Production vs Flock Age" : "Weight Gain vs Age"}
                       data={chartData}
                       dataKey={flock.type === BirdType.LAYER ? "eggProduction" : "avgWeightG"}
                       labelKey="label"
                       unit={flock.type === BirdType.LAYER ? "eggs" : "g"}
                       type="area"
                       color="#3b82f6"
                       showMovingAverage={true}
                   />

                   {/* Production Volume Bar Chart */}
                   <PerformanceChart 
                       title="Daily Production Volume"
                       data={chartData}
                       dataKey={flock.type === BirdType.LAYER ? "eggProduction" : "feedConsumedKg"}
                       labelKey="label"
                       unit={flock.type === BirdType.LAYER ? "eggs" : "kg feed"}
                       type="bar"
                       color={flock.type === BirdType.LAYER ? "#eab308" : "#f97316"}
                   />
               </div>

               {/* Secondary Metrics Row */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   {/* Mortality Trend */}
                   <PerformanceChart 
                       title="Mortality Trend"
                       data={chartData}
                       dataKey="mortality"
                       labelKey="label"
                       unit="birds"
                       type="line"
                       color="#ef4444"
                       height={250}
                   />

                   {/* Cumulative Mortality Rate */}
                   <PerformanceChart 
                       title="Cumulative Mortality Rate"
                       data={chartData}
                       dataKey="cumulativeMortalityRate"
                       labelKey="label"
                       unit="%"
                       type="line"
                       color="#f472b6"
                       height={250}
                   />
               </div>
            </div>
         )}

         {/* LOGS TAB */}
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
                                <div className="flex items-center gap-2">
                                  {log.mortality > 0 ? log.mortality : '-'}
                                  {log.mortalityImage && (
                                      <button 
                                        onClick={() => setViewProofUrl(log.mortalityImage)}
                                        className="text-slate-400 hover:text-primary-600 transition-colors"
                                        title="View Proof"
                                      >
                                          <ImageIcon size={16} />
                                      </button>
                                  )}
                                  {log.mortalityReason && (
                                      <span className="text-xs text-slate-400 truncate max-w-[100px] block" title={log.mortalityReason}>
                                          ({log.mortalityReason})
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
                     </tbody>
                  </table>
               </div>
            </div>
         )}

         {activeTab === 'EGG_PROD' && (
             <EggProductionModule flock={flock} inventoryItems={inventoryItems} onRequestRecord={() => setIsLogModalOpen(true)} />
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
                           Leverage Gemini AI to analyze growth patterns and mortality risks.
                        </p>
                     </div>
                  </div>
                  
                  {!aiAnalysis ? (
                     <button onClick={handleRunAnalysis} disabled={isLoadingAi} className="bg-white text-purple-700 px-6 py-3 rounded-lg font-bold shadow-sm flex items-center gap-2">
                        {isLoadingAi ? 'Analyzing...' : 'Generate Report'}
                     </button>
                  ) : (
                     <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                        <h3 className="font-bold mb-2">Analysis Result</h3>
                        <p className="opacity-90">{aiAnalysis.analysis}</p>
                     </div>
                  )}
               </div>
            </div>
         )}
      </div>

      {/* Proof Modal */}
      {viewProofUrl && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewProofUrl(null)}>
            <div className="relative max-w-3xl max-h-[90vh] bg-black rounded-xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                <button onClick={() => setViewProofUrl(null)} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition-colors z-10">
                    <X size={24} />
                </button>
                <img src={viewProofUrl} alt="Proof" className="w-full h-full object-contain" />
            </div>
        </div>
      )}

      {/* Modals */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-6 border-b border-slate-200"><h3 className="font-bold text-lg text-slate-900">Update Status</h3></div>
              <div className="p-6">
                 <select value={statusUpdateData.status} onChange={(e) => setStatusUpdateData({...statusUpdateData, status: e.target.value as FlockStatus})} className="w-full px-3 py-2 border rounded-lg">
                    <option value={FlockStatus.ACTIVE}>Active</option>
                    <option value={FlockStatus.HARVESTED}>Harvested</option>
                    <option value={FlockStatus.QUARANTINE}>Quarantine</option>
                 </select>
                 <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setIsStatusModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                    <button onClick={handleStatusUpdate} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Update</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isLogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                 <div>
                    <h3 className="font-bold text-lg text-slate-900">Daily Log Entry</h3>
                    <p className="text-sm text-slate-500">{flock.name} • {logFormData.date}</p>
                 </div>
                 <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddLog} className="p-6 space-y-6">
                 {logFormError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2"><AlertTriangle size={16}/> {logFormError}</div>}
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* LEFT COLUMN: Mortality & Health */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                            <AlertTriangle size={14} className="text-red-500"/> Mortality & Health
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Log Date</label>
                                <input type="date" required value={logFormData.date} onChange={e => setLogFormData({...logFormData, date: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Mortality Count</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={logFormData.mortality} 
                                    onChange={e => setLogFormData({...logFormData, mortality: Number(e.target.value)})} 
                                    className="w-full border border-slate-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none" 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Reason / Cause</label>
                            <input 
                                type="text"
                                placeholder="e.g. Heat stress, Unknown" 
                                value={logFormData.mortalityReason} 
                                onChange={e => setLogFormData({...logFormData, mortalityReason: e.target.value})} 
                                className="w-full border border-slate-300 p-2 rounded-lg text-sm" 
                            />
                        </div>

                        {/* Proof Section */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-2">Evidence Photo (Optional)</label>
                            <div className="flex items-start gap-4">
                                {logFormData.mortalityImage ? (
                                    <div className="relative">
                                        <div className="h-24 w-24 rounded-lg overflow-hidden border border-slate-300 shadow-sm">
                                            <img src={logFormData.mortalityImage} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setLogFormData(prev => ({...prev, mortalityImage: ''}))}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border-2 border-dashed border-slate-300 rounded-lg h-24 w-24 flex flex-col items-center justify-center transition-all">
                                        <Camera size={20} className="mb-1" />
                                        <span className="text-[10px] font-bold">Upload</span>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                )}

                                {/* AI Diagnosis Button */}
                                {logFormData.mortalityImage && (
                                    <button
                                        type="button"
                                        onClick={handleDiagnoseImage}
                                        disabled={isDiagnosing}
                                        className="flex-1 bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors flex items-center justify-center gap-2 h-24"
                                    >
                                        {isDiagnosing ? <Loader2 size={16} className="animate-spin" /> : <Stethoscope size={16} />}
                                        {isDiagnosing ? 'Analyzing...' : 'Diagnose Cause (AI)'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Consumption & Production */}
                    <div className="space-y-6">
                        {/* Consumption */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                                <Wheat size={14} className="text-orange-500"/> Consumption
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Select Feed Stock</label>
                                    <select 
                                        value={logFormData.selectedFeedId}
                                        onChange={e => setLogFormData({...logFormData, selectedFeedId: e.target.value})}
                                        className="w-full border border-slate-300 p-2 rounded-lg text-sm bg-white"
                                    >
                                        <option value="">-- Choose Feed --</option>
                                        {feedItems.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} ({item.quantity} {item.unit})
                                            </option>
                                        ))}
                                    </select>
                                    {selectedFeed && (
                                        <div className={`text-[10px] mt-1 ${selectedFeed.quantity < 50 ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                                            Available: {selectedFeed.quantity} {selectedFeed.unit}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Feed Used (kg)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="0.1"
                                        value={logFormData.feedConsumedKg || ''} 
                                        onChange={e => setLogFormData({...logFormData, feedConsumedKg: Number(e.target.value)})} 
                                        className="w-full border border-slate-300 p-2 rounded-lg text-sm" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Water (L)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="0.1"
                                        value={logFormData.waterConsumedL || ''} 
                                        onChange={e => setLogFormData({...logFormData, waterConsumedL: Number(e.target.value)})} 
                                        className="w-full border border-slate-300 p-2 rounded-lg text-sm" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Production */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                                <Activity size={14} className="text-blue-500"/> Production & Growth
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Avg Weight (g)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={logFormData.avgWeightG || ''} 
                                        onChange={e => setLogFormData({...logFormData, avgWeightG: Number(e.target.value)})} 
                                        className="w-full border border-slate-300 p-2 rounded-lg text-sm" 
                                    />
                                </div>
                                
                                {flock.type === BirdType.LAYER && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Total Eggs</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={logFormData.eggProduction || ''} 
                                                onChange={e => setLogFormData({...logFormData, eggProduction: Number(e.target.value)})} 
                                                className="w-full border border-slate-300 p-2 rounded-lg text-sm" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Damaged/Cracked</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={logFormData.eggsDamaged || ''} 
                                                onChange={e => setLogFormData({...logFormData, eggsDamaged: Number(e.target.value)})} 
                                                className="w-full border border-slate-300 p-2 rounded-lg text-sm text-red-600" 
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-2 rounded-lg border border-yellow-100 text-xs">
                                                <PackageCheck size={14} />
                                                Net count will be added to 'Table Eggs' inventory automatically.
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Notes / Observations</label>
                    <textarea 
                        placeholder="Any behavioral changes, equipment issues, etc." 
                        value={logFormData.notes} 
                        onChange={e => setLogFormData({...logFormData, notes: e.target.value})} 
                        className="w-full border border-slate-300 p-2 rounded-lg text-sm h-24 resize-none focus:ring-2 focus:ring-primary-500 outline-none" 
                    />
                 </div>

                 <div className="pt-2 flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={() => setIsLogModalOpen(false)}
                        className="px-6 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                    >
                        <Save size={18} /> Save Entry
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default FlockDetail;