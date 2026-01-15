import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Flock, ViewState, BirdType, FlockStatus, InventoryItem, HrTask, InventoryCategory, FarmProfile, Transaction } from '../types';
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  Bird, 
  Egg, 
  Activity, 
  Clock,
  CheckCircle2,
  AlertOctagon,
  Wheat,
  Plus,
  FileText,
  ShoppingBag,
  Droplets,
  ChevronRight,
  Sun,
  Cloud,
  Thermometer,
  CloudRain,
  CloudLightning,
  BarChart3,
  ArrowDownRight,
  Wallet,
  ArrowUpRight,
  PieChart,
  DollarSign,
  Scale,
  Bell,
  Package,
  Calendar
} from 'lucide-react';

interface DashboardProps {
  flocks: Flock[];
  inventoryItems: InventoryItem[];
  tasks: HrTask[];
  transactions: Transaction[];
  onNavigate: (view: ViewState) => void;
  farmProfile: FarmProfile;
}

// --- Chart Components ---

const DashboardAreaChart = ({ 
  data, 
  dataKey, 
  labelKey = 'label', 
  color = '#3b82f6', 
  unit = '', 
  height = 250
}: { 
  data: any[], 
  dataKey: string, 
  labelKey?: string, 
  color?: string, 
  unit?: string, 
  height?: number
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>;

  const padding = { top: 20, right: 20, bottom: 30, left: 35 };
  const width = 1000; 
  const chartHeight = height;
  const chartWidth = width;

  const values = data.map(d => Number(d[dataKey] || 0));
  const maxVal = Math.max(...values, 1) * 1.1;

  const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * (chartWidth - padding.left - padding.right);
  const getY = (value: number) => chartHeight - padding.bottom - (value / maxVal) * (chartHeight - padding.top - padding.bottom);

  const points = data.map((d, i) => ({
    x: getX(i),
    y: getY(Number(d[dataKey] || 0)),
    value: Number(d[dataKey] || 0),
    label: d[labelKey],
    original: d
  }));

  const generatePath = (pts: typeof points, close: boolean = false) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${padding.left} ${getY(pts[0].value)} L ${chartWidth - padding.right} ${getY(pts[0].value)}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2; // Defined p3 to fix reference error
      
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    if (close) d += ` L ${pts[pts.length - 1].x} ${chartHeight - padding.bottom} L ${pts[0].x} ${chartHeight - padding.bottom} Z`;
    return d;
  };

  const path = generatePath(points);
  const areaPath = generatePath(points, true);

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

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full select-none cursor-crosshair group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const y = padding.top + t * (chartHeight - padding.top - padding.bottom);
            const v = maxVal * (1-t);
            return (
              <g key={t}>
                <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4"/>
                <text x={padding.left - 5} y={y + 3} textAnchor="end" className="text-[10px] fill-slate-300 font-medium">
                  {v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0)}
                </text>
              </g>
            )
        })}
        
        <path d={areaPath} fill={`url(#grad-${dataKey})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        
        {activePoint && (
          <g>
            <line x1={activePoint.x} y1={padding.top} x2={activePoint.x} y2={chartHeight - padding.bottom} stroke={color} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <circle cx={activePoint.x} cy={activePoint.y} r="6" fill="white" stroke={color} strokeWidth="3" />
          </g>
        )}

        {points.map((p, i) => {
           const density = Math.ceil(points.length / 6);
           if (i % density === 0) {
             return <text key={i} x={p.x} y={chartHeight - 5} textAnchor="middle" className="text-[10px] fill-slate-400 font-medium">{p.label}</text>
           }
           return null;
        })}
      </svg>

      {activePoint && (
        <div 
          className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur-sm text-white text-xs rounded-lg p-2 shadow-xl border border-slate-700 transform -translate-x-1/2 -translate-y-full transition-all duration-75"
          style={{ left: `${(activePoint.x / chartWidth) * 100}%`, top: `${(activePoint.y / chartHeight) * 100}%`, marginTop: '-15px' }}
        >
          <div className="font-bold whitespace-nowrap">{activePoint.value.toLocaleString()} {unit}</div>
          <div className="text-slate-400 text-[10px]">{activePoint.label}</div>
        </div>
      )}
    </div>
  );
};

const FinancialLineChart = ({ 
  data, 
  currencySymbol,
  height = 250
}: { 
  data: any[], 
  currencySymbol: string,
  height?: number
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-slate-400 text-sm">No financial data</div>;

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = 1000;
  const chartHeight = height;
  const chartWidth = width;

  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 100) * 1.1;

  const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * (chartWidth - padding.left - padding.right);
  const getY = (val: number) => chartHeight - padding.bottom - (val / maxVal) * (chartHeight - padding.top - padding.bottom);

  const generateLine = (key: 'income' | 'expense') => {
    if (data.length === 0) return "";
    let d = `M ${getX(0)} ${getY(data[0][key])}`;
    for (let i = 0; i < data.length - 1; i++) {
        const x1 = getX(i);
        const y1 = getY(data[i][key]);
        const x2 = getX(i + 1);
        const y2 = getY(data[i+1][key]);
        const cp1x = x1 + (x2 - x1) / 3;
        const cp2x = x2 - (x2 - x1) / 3;
        d += ` C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
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
    data.forEach((_, i) => {
      const dist = Math.abs(getX(i) - relX);
      if (dist < minDist) { minDist = dist; nearestIdx = i; }
    });
    setHoverIndex(nearestIdx);
  };

  const activeData = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full select-none cursor-crosshair group"
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
                <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4"/>
                <text x={padding.left - 8} y={y + 3} textAnchor="end" className="text-[10px] fill-slate-300 font-medium">
                  {val >= 1000 ? `${(val/1000).toFixed(0)}k` : val.toFixed(0)}
                </text>
              </g>
            )
        })}

        <path d={generateLine('income')} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={generateLine('expense')} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {data.map((d, i) => (
            <g key={i}>
                <circle cx={getX(i)} cy={getY(d.income)} r="4" fill="#10b981" stroke="white" strokeWidth="1.5" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                <circle cx={getX(i)} cy={getY(d.expense)} r="4" fill="#ef4444" stroke="white" strokeWidth="1.5" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Labels */}
                {i % Math.ceil(data.length/6) === 0 && (
                    <text x={getX(i)} y={chartHeight - 5} textAnchor="middle" className="text-[10px] fill-slate-400 font-medium">{d.label}</text>
                )}
            </g>
        ))}

        {activeData && hoverIndex !== null && (
            <line x1={getX(hoverIndex)} y1={padding.top} x2={getX(hoverIndex)} y2={chartHeight - padding.bottom} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
        )}
      </svg>

      {activeData && hoverIndex !== null && (
        <div 
          className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur-sm text-white text-xs rounded-lg p-3 shadow-xl border border-slate-700 min-w-[140px]"
          style={{ 
            left: `${(getX(hoverIndex) / chartWidth) * 100}%`, 
            top: '10%',
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300">{activeData.label}</div>
          <div className="flex justify-between gap-4 mb-1">
            <span className="text-emerald-400 font-medium">Revenue:</span>
            <span className="font-bold">{currencySymbol}{activeData.income.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-rose-400 font-medium">Expenses:</span>
            <span className="font-bold">{currencySymbol}{activeData.expense.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const FeedBarChart = ({ 
    data, 
    height = 250
  }: { 
    data: { label: string, value: number }[], 
    height?: number
  }) => {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-slate-400 text-sm">No feed data</div>;
  
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = 1000;
    const chartHeight = height;
    const chartWidth = width;
  
    const maxVal = Math.max(...data.map(d => d.value), 10) * 1.1;
  
    const getX = (index: number) => padding.left + (index / data.length) * (chartWidth - padding.left - padding.right);
    const barWidth = ((chartWidth - padding.left - padding.right) / data.length) * 0.5;
    const getY = (val: number) => chartHeight - padding.bottom - (val / maxVal) * (chartHeight - padding.top - padding.bottom);
    const getBarHeight = (val: number) => (val / maxVal) * (chartHeight - padding.top - padding.bottom);
  
    return (
      <div className="relative w-full h-full select-none">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
              const y = padding.top + t * (chartHeight - padding.top - padding.bottom);
              const val = maxVal * (1 - t);
              return (
                <g key={t}>
                  <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4"/>
                  <text x={padding.left - 5} y={y + 3} textAnchor="end" className="text-[10px] fill-slate-300 font-medium">
                    {val.toFixed(0)}
                  </text>
                </g>
              )
          })}
  
          {data.map((d, i) => {
            const x = getX(i);
            const slotWidth = (chartWidth - padding.left - padding.right) / data.length;
            const centerX = x + slotWidth / 2;
            const h = getBarHeight(d.value);
  
            return (
              <g key={i} className="group">
                <rect 
                  x={centerX - barWidth / 2} 
                  y={getY(d.value)} 
                  width={barWidth} 
                  height={h} 
                  fill="#f97316" 
                  rx="4"
                  className="opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <text x={centerX} y={chartHeight - 20} textAnchor="middle" className="text-[10px] fill-slate-500 font-medium" transform={`rotate(-45, ${centerX}, ${chartHeight - 20})`}>{d.label}</text>
                
                {/* Tooltip via Title for simplicity in this SVG or could be overlay */}
                <title>{d.label}: {d.value} kg</title>
              </g>
            );
          })}
        </svg>
      </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ flocks, inventoryItems, tasks, transactions, onNavigate, farmProfile }) => {
  const [weather, setWeather] = useState<{
    temp: number;
    humidity: number;
    condition: string;
    isDay: boolean;
  } | null>(null);

  const currencySymbol = farmProfile.currencySymbol || '$';

  // --- Fetch Weather ---
  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      try {
        const { latitude, longitude } = farmProfile;
        const lat = latitude || 9.03;
        const lng = longitude || 38.74;

        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,is_day`
        );
        if (!response.ok) throw new Error('Weather API error');
        const data = await response.json();
        
        if (isMounted && data.current) {
          const code = data.current.weather_code;
          let condition = 'Clear';
          if (code <= 3) condition = 'Cloudy';
          else if (code <= 48) condition = 'Fog';
          else if (code <= 82) condition = 'Rain';
          else condition = 'Storm';

          setWeather({
            temp: Math.round(data.current.temperature_2m),
            humidity: data.current.relative_humidity_2m,
            condition: condition,
            isDay: data.current.is_day === 1
          });
        }
      } catch (error) {
        if (isMounted) setWeather({ temp: 25, humidity: 60, condition: 'Clear', isDay: true });
      }
    };
    fetchWeather();
    return () => { isMounted = false; };
  }, [farmProfile]);

  // --- KPI Calculations ---

  const activeFlocks = useMemo(() => flocks.filter(f => f.status === FlockStatus.ACTIVE), [flocks]);
  
  // 1. Total Birds by Age Group
  const birdDemographics = useMemo(() => {
      const stats: Record<string, number> = {};
      let total = 0;
      activeFlocks.forEach(f => {
          const stage = f.productionStage || 'Unknown';
          stats[stage] = (stats[stage] || 0) + f.currentCount;
          total += f.currentCount;
      });
      return { stats, total };
  }, [activeFlocks]);

  // 2. Egg Production (Today, Week, Month)
  const eggProduction = useMemo(() => {
      let today = 0;
      let week = 0;
      let month = 0;
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      
      activeFlocks.filter(f => f.type === BirdType.LAYER).forEach(f => {
          f.logs.forEach(log => {
              const logDate = new Date(log.date);
              
              // Today
              if (log.date === todayStr) today += (log.eggProduction || 0);
              
              // Week
              if (logDate >= sevenDaysAgo) week += (log.eggProduction || 0);
              
              // Month
              if (logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear()) {
                  month += (log.eggProduction || 0);
              }
          });
      });
      return { today, week, month };
  }, [activeFlocks]);

  // 3. Feed Consumption vs Standard & By Flock
  const feedStats = useMemo(() => {
      let totalFeedToday = 0;
      const flockUsage: { label: string, value: number }[] = [];
      const todayStr = new Date().toISOString().split('T')[0];

      activeFlocks.forEach(f => {
          const log = f.logs.find(l => l.date === todayStr);
          const feed = log?.feedConsumedKg || 0;
          totalFeedToday += feed;
          flockUsage.push({ label: f.name, value: feed });
      });

      // Simple Standard Estimation: 110g/bird avg for layers, 150g for broilers
      const estimatedStandardKg = activeFlocks.reduce((acc: number, f) => {
          const stdPerBird = f.type === BirdType.BROILER ? 0.15 : 0.11;
          return acc + (f.currentCount * stdPerBird);
      }, 0);

      const status = totalFeedToday > estimatedStandardKg * 1.1 ? 'Over' : totalFeedToday < estimatedStandardKg * 0.9 ? 'Under' : 'On Track';

      return { totalFeedToday, estimatedStandardKg, status, flockUsage };
  }, [activeFlocks]);

  // 4. Mortality Rate (Global) & Profit Margin
  const healthAndFinance = useMemo(() => {
      const totalInitial = activeFlocks.reduce((acc: number, f) => acc + f.initialCount, 0);
      const totalCurrent = activeFlocks.reduce((acc: number, f) => acc + f.currentCount, 0);
      const mortalityRate = totalInitial > 0 ? ((totalInitial - totalCurrent) / totalInitial) * 100 : 0;

      // Financials
      let revenue = 0;
      let expenses = 0;
      
      transactions.forEach(t => {
          if (t.type === 'INCOME') revenue += t.amount;
          else expenses += t.amount;
      });

      const profit = revenue - expenses;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const cashBalance = profit; // Simplified cash balance

      return { mortalityRate, revenue, expenses, profit, margin, cashBalance };
  }, [activeFlocks, transactions]);

  // 5. Unit Economics
  const unitEconomics = useMemo(() => {
      // Cost per Egg (Approximation based on Layer Flocks)
      const layerFlockIds = activeFlocks.filter(f => f.type === BirdType.LAYER).map(f => f.id);
      const layerExpenses = transactions
          .filter(t => t.type === 'EXPENSE' && (t.flockId && layerFlockIds.includes(t.flockId) || t.category === 'Feed'))
          .reduce((acc: number, t) => acc + t.amount, 0);
      
      const totalEggs = activeFlocks.reduce((acc: number, f) => acc + f.logs.reduce((sum: number, l) => sum + (l.eggProduction || 0), 0), 0);
      const costPerEgg = totalEggs > 0 ? layerExpenses / totalEggs : 0;

      // Cost per Kg Live Weight (Broilers)
      const broilerFlocks = activeFlocks.filter(f => f.type === BirdType.BROILER);
      const broilerExpenses = transactions
          .filter(t => t.type === 'EXPENSE' && (t.flockId && broilerFlocks.map(b => b.id).includes(t.flockId)))
          .reduce((acc: number, t) => acc + t.amount, 0);
      
      const totalBiomassKg = broilerFlocks.reduce((acc: number, f) => {
          const lastLog = f.logs[f.logs.length - 1];
          const avgWeight = lastLog?.avgWeightG || 0;
          return acc + (f.currentCount * avgWeight / 1000);
      }, 0);

      const costPerKg = totalBiomassKg > 0 ? broilerExpenses / totalBiomassKg : 0;

      return { costPerEgg, costPerKg };
  }, [activeFlocks, transactions]);

  // 6. Graphs Data
  const chartsData = useMemo(() => {
      // Egg Production Trend (Last 7 Days)
      const eggTrend = [];
      for(let i=6; i>=0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          const val = activeFlocks.reduce((acc: number, f) => {
              const log = f.logs.find(l => l.date === dStr);
              return acc + (log?.eggProduction || 0);
          }, 0);
          eggTrend.push({ label: d.toLocaleDateString('en-US', {weekday:'short'}), value: val });
      }

      // Revenue vs Expenses (Last 6 Months)
      const financialTrend = [];
      for(let i=5; i>=0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const month = d.getMonth();
          const year = d.getFullYear();
          
          let inc = 0, exp = 0;
          transactions.forEach(t => {
              const td = new Date(t.date);
              if (td.getMonth() === month && td.getFullYear() === year) {
                  if (t.type === 'INCOME') inc += t.amount;
                  else exp += t.amount;
              }
          });
          financialTrend.push({ label: d.toLocaleString('default', {month:'short'}), income: inc, expense: exp });
      }

      return { eggTrend, financialTrend };
  }, [activeFlocks, transactions]);

  // 7. System Alerts & Recent Activity
  const systemAlerts = useMemo(() => {
    const list = [];
    // Inventory
    inventoryItems.forEach(item => {
        if (item.quantity <= item.minLevel) {
            list.push({ type: 'STOCK', level: 'HIGH', message: `Low Stock: ${item.name} (${item.quantity} ${item.unit})`, id: item.id });
        }
    });
    // Tasks
    const today = new Date().toISOString().split('T')[0];
    tasks.forEach(task => {
        if (task.status !== 'COMPLETED' && task.dueDate < today) {
            list.push({ type: 'TASK', level: 'MEDIUM', message: `Overdue Task: ${task.title}`, id: task.id });
        } else if (task.status !== 'COMPLETED' && task.dueDate === today) {
            list.push({ type: 'TASK', level: 'LOW', message: `Due Today: ${task.title}`, id: task.id });
        }
    });
    // Flocks
    activeFlocks.forEach(flock => {
         const mortality = flock.initialCount > 0 ? (flock.initialCount - flock.currentCount) / flock.initialCount : 0;
         if (mortality > 0.05) {
             list.push({ type: 'HEALTH', level: 'HIGH', message: `High Mortality: ${flock.name} (${(mortality*100).toFixed(1)}%)`, id: flock.id });
         }
    });
    return list.slice(0, 5); // Limit to 5
  }, [inventoryItems, tasks, activeFlocks]);

  const recentActivity = useMemo(() => {
    return transactions.slice(0, 6).map(t => ({
        id: t.id,
        title: t.category,
        desc: t.description,
        amount: t.amount,
        type: t.type,
        date: t.date
    }));
  }, [transactions]);

  // Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const WeatherIcon = () => {
    if (!weather) return <Cloud size={40} className="text-white/80" />;
    if (weather.condition === 'Clear') return <Sun size={40} className="text-yellow-300" />;
    if (weather.condition === 'Rain') return <CloudRain size={40} className="text-blue-200" />;
    return <Cloud size={40} className="text-white/80" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Top Header & Weather */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
         <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
         
         <div className="relative z-10">
            <div className="flex items-center gap-2 text-primary-300 font-medium text-sm mb-1 uppercase tracking-wider">
               {greeting}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Farm Command Center</h1>
            <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    <Bird size={16} className="text-primary-300" /> 
                    <span className="font-bold">{birdDemographics.total.toLocaleString()}</span> <span className="text-xs opacity-70">Birds</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    <Wallet size={16} className="text-green-300" /> 
                    <span className="font-bold">{currencySymbol}{healthAndFinance.cashBalance.toLocaleString()}</span> <span className="text-xs opacity-70">Cash</span>
                </div>
            </div>
         </div>

         <div className="relative z-10 flex items-center gap-6 bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10">
             <div>
                 <div className="text-2xl font-bold">{weather?.temp}°C</div>
                 <div className="text-xs opacity-80">{weather?.condition}</div>
             </div>
             <div className="h-8 w-px bg-white/20"></div>
             <WeatherIcon />
         </div>
      </div>

      {/* Row 1: High Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Birds Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Bird size={14} /> Population by Stage
              </h3>
              <div className="space-y-3">
                  {Object.entries(birdDemographics.stats).map(([stage, count], idx) => (
                      <div key={stage} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{stage}</span>
                          <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${idx % 2 === 0 ? 'bg-blue-500' : 'bg-primary-500'}`} style={{width: `${(count / birdDemographics.total)*100}%`}}></div>
                              </div>
                              <span className="font-bold text-slate-900">{count.toLocaleString()}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* Mortality Gauge */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                      <AlertOctagon size={14} /> Mortality Rate
                  </h3>
                  <div className="text-3xl font-bold text-slate-900 mt-2">
                      {healthAndFinance.mortalityRate.toFixed(2)}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Lifetime average</p>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${healthAndFinance.mortalityRate > 5 ? 'bg-red-500' : healthAndFinance.mortalityRate > 2 ? 'bg-orange-500' : 'bg-green-500'}`} 
                    style={{width: `${Math.min(Number(healthAndFinance.mortalityRate) * 5, 100)}%`}} // Scale for visualization
                  ></div>
              </div>
          </div>

          {/* Profit Margin */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                      <PieChart size={14} /> Profit Margin
                  </h3>
                  <div className={`text-3xl font-bold mt-2 ${healthAndFinance.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {healthAndFinance.margin.toFixed(1)}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Net Income / Revenue</p>
              </div>
              <div className="flex gap-2 mt-4">
                  <div className="flex-1 bg-green-50 rounded p-1 text-center">
                      <span className="text-[10px] text-green-700 font-bold block">REV</span>
                      <span className="text-xs font-medium text-green-900">${(healthAndFinance.revenue/1000).toFixed(1)}k</span>
                  </div>
                  <div className="flex-1 bg-red-50 rounded p-1 text-center">
                      <span className="text-[10px] text-red-700 font-bold block">EXP</span>
                      <span className="text-xs font-medium text-red-900">${(healthAndFinance.expenses/1000).toFixed(1)}k</span>
                  </div>
              </div>
          </div>

          {/* Cash Balance Card */}
          <div className="bg-emerald-600 text-white p-5 rounded-xl shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 text-emerald-500 opacity-20">
                  <DollarSign size={100} />
              </div>
              <div>
                  <h3 className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1">Cash Balance</h3>
                  <div className="text-3xl font-bold mt-1">{currencySymbol}{healthAndFinance.cashBalance.toLocaleString()}</div>
              </div>
              <div className="relative z-10 mt-4 pt-4 border-t border-emerald-500/30 flex justify-between text-xs font-medium text-emerald-100">
                  <span>Available Funds</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded text-white">Live</span>
              </div>
          </div>
      </div>

      {/* Row 1.5: Alerts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Alerts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Bell size={18} className="text-orange-500" /> System Alerts
                  </h3>
                  <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500">
                      {systemAlerts.length} Active
                  </span>
              </div>
              <div className="p-4 flex-1">
                  {systemAlerts.length > 0 ? (
                      <div className="space-y-3">
                          {systemAlerts.map((alert, i) => (
                              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                                  alert.level === 'HIGH' ? 'bg-red-50 border-red-100' : 
                                  alert.level === 'MEDIUM' ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'
                              }`}>
                                  {alert.type === 'STOCK' ? <Package size={16} className={alert.level === 'HIGH' ? 'text-red-600' : 'text-orange-600'} /> :
                                   alert.type === 'TASK' ? <Clock size={16} className={alert.level === 'HIGH' ? 'text-red-600' : 'text-blue-600'} /> :
                                   <AlertTriangle size={16} className="text-red-600" />}
                                  <div>
                                      <p className={`text-sm font-medium ${
                                          alert.level === 'HIGH' ? 'text-red-900' : 
                                          alert.level === 'MEDIUM' ? 'text-orange-900' : 'text-blue-900'
                                      }`}>{alert.message}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                          <CheckCircle2 size={32} className="mb-2 opacity-20" />
                          <p className="text-sm">All systems normal.</p>
                      </div>
                  )}
              </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Activity size={18} className="text-blue-500" /> Recent Activity
                  </h3>
              </div>
              <div className="flex-1 overflow-auto max-h-[300px]">
                  <div className="divide-y divide-slate-100">
                      {recentActivity.map((tx) => (
                          <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      tx.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                  }`}>
                                      {tx.type === 'INCOME' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                  </div>
                                  <div>
                                      <p className="text-sm font-medium text-slate-900">{tx.title}</p>
                                      <p className="text-xs text-slate-500 truncate max-w-[180px]">{tx.desc}</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className={`text-sm font-bold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-slate-900'}`}>
                                      {tx.type === 'INCOME' ? '+' : '-'}{currencySymbol}{tx.amount.toLocaleString()}
                                  </p>
                                  <p className="text-[10px] text-slate-400">{tx.date}</p>
                              </div>
                          </div>
                      ))}
                      {recentActivity.length === 0 && (
                          <div className="p-8 text-center text-slate-400 text-sm">No recent transactions.</div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* Row 2: Production Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Egg Production Stats */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Egg size={20} className="text-yellow-500" /> Egg Production
                  </h3>
                  <div className="flex gap-4 text-sm">
                      <div className="text-right">
                          <span className="block text-xs text-slate-400 font-bold uppercase">Today</span>
                          <span className="font-bold text-slate-800 text-lg">{eggProduction.today.toLocaleString()}</span>
                      </div>
                      <div className="h-8 w-px bg-slate-100"></div>
                      <div className="text-right">
                          <span className="block text-xs text-slate-400 font-bold uppercase">This Week</span>
                          <span className="font-bold text-slate-800 text-lg">{eggProduction.week.toLocaleString()}</span>
                      </div>
                      <div className="h-8 w-px bg-slate-100"></div>
                      <div className="text-right">
                          <span className="block text-xs text-slate-400 font-bold uppercase">This Month</span>
                          <span className="font-bold text-slate-800 text-lg">{eggProduction.month.toLocaleString()}</span>
                      </div>
                  </div>
              </div>
              
              <div className="h-48 w-full">
                  <DashboardAreaChart 
                      data={chartsData.eggTrend}
                      dataKey="value"
                      color="#eab308"
                      unit="eggs"
                      height={192}
                  />
              </div>
          </div>

          {/* Unit Economics & Feed */}
          <div className="space-y-6">
              {/* Unit Cost Cards */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="p-2 bg-yellow-50 rounded-lg w-fit text-yellow-600 mb-2"><Egg size={18} /></div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Cost / Egg</p>
                      <h4 className="text-xl font-bold text-slate-900">{currencySymbol}{unitEconomics.costPerEgg.toFixed(2)}</h4>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="p-2 bg-blue-50 rounded-lg w-fit text-blue-600 mb-2"><Scale size={18} /></div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Cost / Kg Live</p>
                      <h4 className="text-xl font-bold text-slate-900">{currencySymbol}{unitEconomics.costPerKg.toFixed(2)}</h4>
                  </div>
              </div>

              {/* Feed Consumption */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="font-bold text-slate-900 flex items-center gap-2">
                              <Wheat size={18} className="text-orange-500" /> Feed Consumption
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">Today vs Standard</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-bold rounded border ${
                          feedStats.status === 'On Track' ? 'bg-green-50 text-green-700 border-green-200' : 
                          feedStats.status === 'Under' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-red-50 text-red-700 border-red-200'
                      }`}>
                          {feedStats.status}
                      </span>
                  </div>
                  
                  <div className="flex items-end gap-2 mb-1">
                      <span className="text-2xl font-bold text-slate-900">{feedStats.totalFeedToday.toLocaleString()}</span>
                      <span className="text-sm text-slate-500 mb-1">kg consumed</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-1">
                      <div className="bg-orange-500 h-full rounded-full" style={{width: `${Math.min((feedStats.totalFeedToday / (feedStats.estimatedStandardKg || 1)) * 100, 100)}%`}}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>0kg</span>
                      <span>Target: ~{feedStats.estimatedStandardKg.toFixed(0)}kg</span>
                  </div>
              </div>
          </div>
      </div>

      {/* Row 3: Financial Chart & Feed Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue vs Expenses Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-green-600" /> Financial Performance
              </h3>
              <div className="h-64">
                  <FinancialLineChart 
                      data={chartsData.financialTrend}
                      currencySymbol={currencySymbol}
                      height={256}
                  />
              </div>
          </div>

          {/* Feed Usage by Flock Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <BarChart3 size={20} className="text-slate-600" /> Feed Usage by Flock (Today)
              </h3>
              <div className="h-64">
                  <FeedBarChart 
                      data={feedStats.flockUsage}
                      height={256}
                  />
              </div>
          </div>
      </div>

    </div>
  );
};

export default Dashboard;