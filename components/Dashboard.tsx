import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Flock, ViewState, BirdType, FlockStatus, InventoryItem, HrTask, InventoryCategory, FarmProfile, Transaction } from '../types';
import { 
  TrendingUp, 
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
  Briefcase,
  CloudRain,
  CloudLightning,
  BarChart3,
  ArrowDownRight,
  Wallet,
  FileWarning,
  Syringe
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

  const padding = { top: 20, right: 20, bottom: 30, left: 30 };
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
      const p3 = pts[i + 2] || p2;
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
           // Show label if it's the first, last, or every nth point depending on density
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

const DashboardBarChart = ({ 
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

  const padding = { top: 20, right: 20, bottom: 30, left: 30 };
  const width = 1000;
  const chartHeight = height;
  const chartWidth = width;

  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 100) * 1.1;

  const getX = (index: number) => padding.left + (index / data.length) * (chartWidth - padding.left - padding.right);
  const barWidth = ((chartWidth - padding.left - padding.right) / data.length) * 0.6; // 60% of slot width
  const getY = (val: number) => chartHeight - padding.bottom - (val / maxVal) * (chartHeight - padding.top - padding.bottom);
  const getBarHeight = (val: number) => (val / maxVal) * (chartHeight - padding.top - padding.bottom);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relX = (x / rect.width) * chartWidth;
    const slotWidth = (chartWidth - padding.left - padding.right) / data.length;
    const idx = Math.floor((relX - padding.left) / slotWidth);
    if (idx >= 0 && idx < data.length) setHoverIndex(idx);
    else setHoverIndex(null);
  };

  const activeData = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full select-none cursor-pointer"
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
                <text x={padding.left - 5} y={y + 3} textAnchor="end" className="text-[10px] fill-slate-300 font-medium">
                  {val >= 1000 ? `${(val/1000).toFixed(0)}k` : val.toFixed(0)}
                </text>
              </g>
            )
        })}

        {data.map((d, i) => {
          const x = getX(i);
          const slotWidth = (chartWidth - padding.left - padding.right) / data.length;
          const centerX = x + slotWidth / 2;
          
          const incH = getBarHeight(d.income);
          const expH = getBarHeight(d.expense);
          
          // Split bar width for double bars
          const singleBarWidth = barWidth / 2 - 2;

          return (
            <g key={i} opacity={hoverIndex !== null && hoverIndex !== i ? 0.4 : 1} transition="opacity 0.2s">
              {/* Income Bar */}
              <rect 
                x={centerX - singleBarWidth - 1} 
                y={getY(d.income)} 
                width={singleBarWidth} 
                height={incH} 
                fill="#10b981" 
                rx="2"
              />
              {/* Expense Bar */}
              <rect 
                x={centerX + 1} 
                y={getY(d.expense)} 
                width={singleBarWidth} 
                height={expH} 
                fill="#ef4444" 
                rx="2"
              />
              <text x={centerX} y={chartHeight - 10} textAnchor="middle" className="text-[10px] fill-slate-500 font-medium">{d.label}</text>
            </g>
          );
        })}
      </svg>

      {activeData && hoverIndex !== null && (
        <div 
          className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur-sm text-white text-xs rounded-lg p-3 shadow-xl border border-slate-700 min-w-[140px]"
          style={{ 
            left: `${(getX(hoverIndex) / chartWidth) * 100}%`, 
            top: '20%',
            transform: 'translate(-50%, 0)' 
          }}
        >
          <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300">{activeData.label}</div>
          <div className="flex justify-between gap-4 mb-1">
            <span className="text-emerald-400 font-medium">Income:</span>
            <span className="font-bold">{currencySymbol}{activeData.income.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-rose-400 font-medium">Expense:</span>
            <span className="font-bold">{currencySymbol}{activeData.expense.toLocaleString()}</span>
          </div>
          <div className="mt-2 pt-1 border-t border-slate-700 flex justify-between gap-4 text-[10px]">
             <span className="text-slate-400">Net:</span>
             <span className={(activeData.income - activeData.expense) >= 0 ? 'text-blue-400' : 'text-orange-400'}>
               {((activeData.income - activeData.expense) >= 0 ? '+' : '')}{currencySymbol}{(activeData.income - activeData.expense).toLocaleString()}
             </span>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ flocks, inventoryItems, tasks, transactions, onNavigate, farmProfile }) => {
  const [chartMode, setChartMode] = useState<'EGGS' | 'WEIGHT' | 'FINANCE'>('EGGS');
  const [weather, setWeather] = useState<{
    temp: number;
    humidity: number;
    condition: string;
    isDay: boolean;
  } | null>(null);

  const currencySymbol = farmProfile.currencySymbol || '$';

  // --- Fetch Weather from Open-Meteo ---
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
        
        if (!response.ok) throw new Error('Weather API response not ok');
        
        const data = await response.json();
        
        if (isMounted && data.current) {
          const code = data.current.weather_code;
          let condition = 'Clear';
          
          // WMO Weather interpretation
          if (code === 0) condition = 'Clear';
          else if (code <= 3) condition = 'Cloudy';
          else if (code <= 48) condition = 'Fog';
          else if (code <= 67) condition = 'Rain';
          else if (code <= 77) condition = 'Snow';
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
        console.warn("Weather data unavailable (using fallback):", error);
        if (isMounted) {
            // Set fallback weather so UI doesn't look broken
            setWeather({
                temp: 25,
                humidity: 60,
                condition: 'Clear',
                isDay: true
            });
        }
      }
    };

    fetchWeather();
    
    return () => { isMounted = false; };
  }, [farmProfile]);

  // --- Data Processing & Calculations ---

  const activeFlocks = flocks.filter(f => f.status === FlockStatus.ACTIVE);
  const broilerFlocks = activeFlocks.filter(f => f.type === BirdType.BROILER);
  const layerFlocks = activeFlocks.filter(f => f.type === BirdType.LAYER);
  
  // Aggregate Metrics
  const totalBirds = activeFlocks.reduce((acc, f) => acc + f.currentCount, 0);
  
  // Today's Metrics (based on latest log of each flock)
  const todayMetrics = activeFlocks.reduce((acc, f) => {
    const lastLog = f.logs[f.logs.length - 1];
    if (lastLog) {
      acc.eggs += (lastLog.eggProduction || 0);
      acc.feed += (lastLog.feedConsumedKg || 0);
      acc.mortality += (lastLog.mortality || 0);
      acc.water += (lastLog.waterConsumedL || 0);
    }
    return acc;
  }, { eggs: 0, feed: 0, mortality: 0, water: 0 });

  // Revenue MTD Calculation
  const revenueMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    let incomeMtd = 0;
    let expenseMtd = 0;
    let lastMtdIncome = 0;

    transactions.forEach(t => {
        const d = new Date(t.date);
        const isCurrentMonth = d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        const isLastMonth = d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;

        if (t.type === 'INCOME') {
            if (isCurrentMonth) incomeMtd += t.amount;
            if (isLastMonth) lastMtdIncome += t.amount;
        } else {
            if (isCurrentMonth) expenseMtd += t.amount;
        }
    });

    const percentChange = lastMtdIncome > 0 ? ((incomeMtd - lastMtdIncome) / lastMtdIncome) * 100 : 0;
    const netProfitMtd = incomeMtd - expenseMtd;

    return { incomeMtd, expenseMtd, netProfitMtd, percentChange };
  }, [transactions]);

  // --- Chart Data: Egg Production Trend (Layers) ---
  const productionTrend = useMemo(() => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      let dailyTotal = 0;
      layerFlocks.forEach(f => {
        const log = f.logs.find(l => l.date === dateStr);
        if (log) {
            dailyTotal += (log.eggProduction || 0);
        }
      });
      data.push({ label: dayName, value: dailyTotal });
    }
    return data;
  }, [layerFlocks]);

  // --- Chart Data: Broiler Growth Trend (Avg Weight) ---
  const broilerGrowthTrend = useMemo(() => {
    const primaryFlock = broilerFlocks[0];
    if (!primaryFlock || primaryFlock.logs.length === 0) return [];

    const recentLogs = primaryFlock.logs.slice(-7); // Last 7 entries
    return recentLogs.map(log => ({
        label: `Day ${log.day}`,
        value: log.avgWeightG
    }));
  }, [broilerFlocks]);

  // --- Chart Data: Financial Overview (Last 6 Months) ---
  const financialTrend = useMemo(() => {
    const months = 6;
    const data = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthLabel = d.toLocaleString('default', { month: 'short' });
        const monthIndex = d.getMonth();
        const year = d.getFullYear();

        let inc = 0;
        let exp = 0;

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate.getMonth() === monthIndex && tDate.getFullYear() === year) {
                if (t.type === 'INCOME') inc += t.amount;
                else exp += t.amount;
            }
        });

        data.push({ label: monthLabel, income: inc, expense: exp });
    }
    return data;
  }, [transactions]);

  // --- Recent Activity Feed ---
  const recentActivities = useMemo(() => {
      const all: { type: 'LOG' | 'TX' | 'TASK', date: string, title: string, sub: string, amount?: number, id: string }[] = [];

      // 1. Transactions
      transactions.slice(0, 10).forEach(t => {
          all.push({
              type: 'TX',
              date: t.date,
              title: t.category,
              sub: t.description,
              amount: t.type === 'INCOME' ? t.amount : -t.amount,
              id: t.id
          });
      });

      // 2. Logs
      activeFlocks.forEach(f => {
          const lastLog = f.logs[f.logs.length - 1];
          if (lastLog) {
              all.push({
                  type: 'LOG',
                  date: lastLog.date,
                  title: `Daily Log: ${f.name}`,
                  sub: `Mortality: ${lastLog.mortality}, Feed: ${lastLog.feedConsumedKg}kg`,
                  id: `log-${f.id}-${lastLog.day}`
              });
          }
      });

      // 3. Tasks
      tasks.filter(t => t.status === 'COMPLETED').slice(0, 5).forEach(t => {
          all.push({
              type: 'TASK',
              date: t.dueDate, // Using due date as completion date proxy for simplicity
              title: `Task Completed`,
              sub: t.title,
              id: t.id
          });
      });

      // Sort and slice
      return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [transactions, activeFlocks, tasks]);

  // --- Priority Actions & Alerts ---
  const alerts = useMemo(() => {
    const list: { type: 'MORTALITY' | 'STOCK' | 'TASK' | 'VACCINE' | 'LOG', priority: 'HIGH' | 'MEDIUM', title: string, sub: string, id: string, action?: () => void, actionLabel?: string }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Missing Daily Logs (CRITICAL)
    activeFlocks.forEach(f => {
        const hasLogToday = f.logs.some(l => l.date === todayStr);
        if (!hasLogToday) {
             list.push({
                 type: 'LOG',
                 priority: 'MEDIUM',
                 title: `Missing Log: ${f.name}`,
                 sub: 'Daily performance log not recorded yet.',
                 id: `missing-log-${f.id}`,
                 action: () => onNavigate('FLOCK_LIST'),
                 actionLabel: 'Record'
             });
        }
    });

    // 2. Mortality Alerts
    activeFlocks.forEach(f => {
        const lastLog = f.logs[f.logs.length - 1];
        if (lastLog) {
            const rate = f.currentCount > 0 ? (lastLog.mortality / f.currentCount) * 100 : 0;
            if (rate > 0.5) {
                list.push({ 
                    type: 'MORTALITY', 
                    priority: 'HIGH', 
                    title: `High Mortality: ${f.name}`, 
                    sub: `${lastLog.mortality} birds lost today (${rate.toFixed(1)}%)`, 
                    id: `mort-${f.id}`,
                    action: () => onNavigate('HEALTH'),
                    actionLabel: 'Investigate'
                });
            }
        }
    });

    // 3. Vaccination Alerts
    activeFlocks.forEach(f => {
        if (f.healthRecords) {
            f.healthRecords.forEach(r => {
                if (r.type === 'VACCINATION' && r.status !== 'RESOLVED') {
                    if (r.date <= todayStr) {
                        list.push({
                            type: 'VACCINE', 
                            priority: 'HIGH',
                            title: `Vaccination Due: ${f.name}`,
                            sub: `${r.title} - ${r.date === todayStr ? 'Today' : 'Overdue'}`,
                            id: `vac-${r.id}`,
                            action: () => onNavigate('HEALTH'),
                            actionLabel: 'Administer'
                        });
                    }
                }
            });
        }
    });

    // 4. Low Stock Alerts
    inventoryItems.filter(i => i.quantity <= i.minLevel).forEach(item => {
        const isCritical = item.quantity === 0;
        list.push({ 
            type: 'STOCK', 
            priority: isCritical ? 'HIGH' : 'MEDIUM', 
            title: `${isCritical ? 'Out of Stock' : 'Low Stock'}: ${item.name}`, 
            sub: `${item.quantity} ${item.unit} remaining`, 
            id: `stock-${item.id}`,
            action: () => onNavigate('FEED'),
            actionLabel: 'Restock'
        });
    });

    // 5. Due Tasks
    tasks.filter(t => t.status !== 'COMPLETED' && t.dueDate <= todayStr).forEach(t => {
        list.push({ 
            type: 'TASK', 
            priority: t.priority === 'HIGH' ? 'HIGH' : 'MEDIUM', 
            title: t.title, 
            sub: `Assigned to ${t.assignedToName.split(' ')[0]}`, 
            id: t.id,
            action: () => onNavigate('HR'),
            actionLabel: 'View'
        });
    });

    return list.sort((a, b) => {
        if (a.priority === b.priority) return 0;
        return a.priority === 'HIGH' ? -1 : 1;
    });
  }, [activeFlocks, inventoryItems, tasks, onNavigate]);

  // --- Feed Inventory ---
  const criticalFeed = useMemo(() => {
    return inventoryItems
      .filter(i => i.category === InventoryCategory.FEED)
      .sort((a, b) => (a.quantity / (a.minLevel || 1)) - (b.quantity / (b.minLevel || 1))) // Sort by relative scarcity
      .slice(0, 3);
  }, [inventoryItems]);

  // --- Time of Day Greeting ---
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // --- Helpers ---
  const getHealthStatus = (flock: Flock) => {
    const lastLog = flock.logs[flock.logs.length - 1];
    if (!lastLog) return 'Unknown';
    if (flock.currentCount === 0) return 'Unknown';
    const mortalityRate = (lastLog.mortality / flock.currentCount) * 100;
    if (mortalityRate > 0.5) return 'Critical';
    if (mortalityRate > 0.1) return 'Warning';
    return 'Good';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Good': return 'text-green-600 bg-green-50 border-green-200';
      case 'Warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  // Weather Icon Logic
  const WeatherIcon = () => {
    if (!weather) return <Cloud size={48} className="opacity-80" />;
    
    if (weather.condition === 'Clear') return <Sun size={48} className="opacity-80" />;
    if (weather.condition === 'Rain') return <CloudRain size={48} className="opacity-80" />;
    if (weather.condition === 'Storm') return <CloudLightning size={48} className="opacity-80" />;
    return <Cloud size={48} className="opacity-80" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-50 to-primary-100 rounded-bl-full -mr-16 -mt-16 opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-primary-700 font-medium text-sm mb-1">
             <Sun size={16} /> {greeting}, Manager
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Farm Operations Center</h1>
          <p className="text-slate-500 mt-2 max-w-lg">
            You have <span className="font-bold text-slate-800">{activeFlocks.length} active flocks</span> and <span className={`font-bold ${alerts.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>{alerts.length} priority actions</span> requiring attention today.
          </p>
        </div>
        
        <div className="flex gap-3 relative z-10">
           <button 
             onClick={() => onNavigate('FLOCK_LIST')}
             className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md shadow-primary-200 flex items-center gap-2 transition-all hover:-translate-y-0.5"
           >
             <Plus size={18} /> New Flock
           </button>
           <button 
             onClick={() => onNavigate('FLOCK_LIST')}
             className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-3 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all"
           >
             <FileText size={18} /> Record Log
           </button>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Birds */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 text-blue-50 group-hover:scale-110 transition-transform duration-500">
              <Bird size={64} />
           </div>
           <div className="relative z-10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Birds</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{totalBirds.toLocaleString()}</h3>
           </div>
           <div className="relative z-10 flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                 {broilerFlocks.length} Broiler
              </span>
              <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                 {layerFlocks.length} Layer
              </span>
           </div>
        </div>

        {/* Eggs Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eggs Collected</p>
                 <h3 className="text-3xl font-bold text-slate-900 mt-1">{todayMetrics.eggs.toLocaleString()}</h3>
              </div>
              <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl">
                 <Egg size={22} />
              </div>
           </div>
           <div className="text-xs text-slate-400">
              Today's production across all layers
           </div>
        </div>

        {/* Feed Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Feed Consumed</p>
                 <h3 className="text-3xl font-bold text-slate-900 mt-1">{todayMetrics.feed.toLocaleString()} <span className="text-base text-slate-400 font-medium">kg</span></h3>
              </div>
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                 <Wheat size={22} />
              </div>
           </div>
           <div className="text-xs text-slate-400">
              {totalBirds > 0 ? `~${(todayMetrics.feed * 1000 / totalBirds).toFixed(0)}g per bird average` : 'No consumption data'}
           </div>
        </div>

        {/* Revenue */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg text-white flex flex-col justify-between h-32 relative overflow-hidden">
           {/* Gradient Overlay */}
           <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 pointer-events-none"></div>
           
           <div className="flex justify-between items-start relative z-10">
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Profit (MTD)</p>
                 <h3 className="text-3xl font-bold mt-1">{currencySymbol}{revenueMetrics.netProfitMtd.toLocaleString()}</h3>
              </div>
              <div className="p-2.5 bg-white/10 rounded-xl">
                 <Wallet size={22} />
              </div>
           </div>
           <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1 text-emerald-400">
                 <TrendingUp size={14} /> 
                 Rev: {currencySymbol}{revenueMetrics.incomeMtd.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-red-400">
                 <ArrowDownRight size={14} /> 
                 Exp: {currencySymbol}{revenueMetrics.expenseMtd.toLocaleString()}
              </span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* LEFT COLUMN: Charts & Flock Status */}
         <div className="lg:col-span-2 space-y-8">
            
            {/* Performance Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
               <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                     <Activity size={20} className="text-primary-600" /> Farm Analytics
                  </h3>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                     <button 
                        onClick={() => setChartMode('EGGS')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${chartMode === 'EGGS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        Egg Production
                     </button>
                     <button 
                        onClick={() => setChartMode('WEIGHT')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${chartMode === 'WEIGHT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        Broiler Growth
                     </button>
                     <button 
                        onClick={() => setChartMode('FINANCE')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${chartMode === 'FINANCE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        <BarChart3 size={12} /> Financials
                     </button>
                  </div>
               </div>
               
               {/* Chart Area */}
               <div className="h-64 w-full relative">
                  {chartMode === 'EGGS' && (
                      <DashboardAreaChart 
                        data={productionTrend} 
                        dataKey="value" 
                        color="#eab308" 
                        unit="eggs" 
                        height={256} 
                      />
                  )}

                  {chartMode === 'WEIGHT' && (
                      <DashboardAreaChart 
                        data={broilerGrowthTrend} 
                        dataKey="value" 
                        color="#3b82f6" 
                        unit="g" 
                        height={256} 
                      />
                  )}

                  {chartMode === 'FINANCE' && (
                      <DashboardBarChart 
                        data={financialTrend} 
                        currencySymbol={currencySymbol} 
                        height={256}
                      />
                  )}
               </div>
            </div>

            {/* Active Flock Status List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                     <Bird size={18} className="text-slate-500" /> Active Flock Status
                  </h3>
                  <button 
                    onClick={() => onNavigate('FLOCK_LIST')}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                     View All <ChevronRight size={14} />
                  </button>
               </div>
               <div className="divide-y divide-slate-100">
                  {activeFlocks.length > 0 ? activeFlocks.map(flock => {
                     const status = getHealthStatus(flock);
                     const lastLog = flock.logs[flock.logs.length - 1];
                     // Simple FCR Calc for list view: Total Feed / (Current Count * Avg Weight)
                     const totalFeed = flock.logs.reduce((acc, l) => acc + (l.feedConsumedKg || 0), 0);
                     const currentBiomassKg = (flock.currentCount * (lastLog?.avgWeightG || 0)) / 1000;
                     const fcr = currentBiomassKg > 0 ? (totalFeed / currentBiomassKg).toFixed(2) : '-';
                     
                     return (
                        <div key={flock.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                           <div className="flex items-center gap-4">
                              <div className={`w-1.5 h-12 rounded-full ${status === 'Good' ? 'bg-green-500' : status === 'Warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                              <div>
                                 <h4 className="font-bold text-slate-900 text-sm">{flock.name}</h4>
                                 <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <span className="capitalize">{flock.type.toLowerCase()}</span>
                                    <span>•</span>
                                    <span>{flock.currentCount.toLocaleString()} birds</span>
                                 </div>
                              </div>
                           </div>
                           
                           <div className="flex items-center gap-6">
                              <div className="text-right hidden sm:block">
                                 <p className="text-[10px] uppercase text-slate-400 font-bold">FCR</p>
                                 <p className="text-sm font-bold text-slate-700">{fcr}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] uppercase text-slate-400 font-bold">Today's Feed</p>
                                 <p className="text-sm font-bold text-slate-700">{lastLog?.feedConsumedKg || 0} kg</p>
                              </div>
                              {flock.type === BirdType.LAYER && (
                                <div className="text-right">
                                   <p className="text-[10px] uppercase text-slate-400 font-bold">Production</p>
                                   <p className="text-sm font-bold text-slate-700">{lastLog?.eggProduction || 0} eggs</p>
                                </div>
                              )}
                              <div className="text-right">
                                 <p className="text-[10px] uppercase text-slate-400 font-bold">Health</p>
                                 <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusColor(status)}`}>
                                    {status}
                                 </span>
                              </div>
                           </div>
                        </div>
                     )
                  }) : (
                     <div className="p-8 text-center text-slate-400 text-sm">
                        No active flocks. Register a new flock to start tracking.
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* RIGHT COLUMN: Farm Pulse / Command Center */}
         <div className="space-y-6">
            
            {/* Weather Widget */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1 opacity-90">
                            <Thermometer size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Farm Environment</span>
                        </div>
                        <div className="text-3xl font-bold">
                          {weather ? `${weather.temp}°C` : '--'}
                        </div>
                        <div className="text-sm opacity-90 mt-1">
                          {weather ? weather.condition : 'Loading...'}
                        </div>
                    </div>
                    <div className="text-right">
                        <WeatherIcon />
                        <div className="text-sm font-bold mt-2 flex items-center justify-end gap-1">
                            <Droplets size={14} /> {weather ? `${weather.humidity}% Hum` : '--'}
                        </div>
                    </div>
                </div>
            </div>

            {/* System Alerts Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                     <AlertTriangle size={18} className="text-red-600" /> System Alerts
                  </h3>
                  {alerts.length > 0 && (
                    <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse">{alerts.length} Warnings</span>
                  )}
               </div>
               
               <div className="max-h-[300px] overflow-y-auto">
                  {alerts.length > 0 ? (
                      alerts.map((alert, idx) => (
                          <div key={`${alert.id}-${idx}`} className="p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors flex gap-3 group">
                              <div className={`mt-1 p-2 rounded-lg shrink-0 h-fit ${
                                  alert.priority === 'HIGH' ? 'bg-red-100 text-red-600' :
                                  'bg-orange-100 text-orange-600'
                              }`}>
                                  {alert.type === 'MORTALITY' && <AlertOctagon size={18} />}
                                  {alert.type === 'STOCK' && <ShoppingBag size={18} />}
                                  {alert.type === 'TASK' && <Briefcase size={18} />}
                                  {alert.type === 'LOG' && <FileWarning size={18} />}
                                  {alert.type === 'VACCINE' && <Syringe size={18} />}
                              </div>
                              <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <h4 className={`text-sm font-bold ${alert.priority === 'HIGH' ? 'text-red-700' : 'text-slate-800'}`}>
                                        {alert.title}
                                    </h4>
                                    {alert.priority === 'HIGH' && <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">CRITICAL</span>}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">{alert.sub}</p>
                                  {alert.action && (
                                    <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={alert.action}
                                            className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                                        >
                                            {alert.actionLabel || 'View'}
                                        </button>
                                    </div>
                                  )}
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="p-8 text-center text-slate-400">
                          <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
                          <p className="text-sm">System Healthy. No active alerts.</p>
                      </div>
                  )}
               </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                     <Clock size={18} className="text-blue-500" /> Recent Activity
                  </h3>
               </div>
               <div className="p-0">
                  {recentActivities.length > 0 ? (
                      <div className="relative">
                          {/* Timeline Line */}
                          <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-100"></div>
                          
                          {recentActivities.map((act, idx) => (
                              <div key={idx} className="relative pl-12 pr-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                                  {/* Dot */}
                                  <div className={`absolute left-[21px] top-4 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${
                                      act.type === 'TX' ? (act.amount && act.amount > 0 ? 'bg-green-500' : 'bg-red-500') :
                                      act.type === 'TASK' ? 'bg-blue-500' : 'bg-slate-400'
                                  }`}></div>
                                  
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <p className="text-xs font-bold text-slate-800">{act.title}</p>
                                          <p className="text-[10px] text-slate-500 mt-0.5">{act.sub}</p>
                                      </div>
                                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{act.date}</span>
                                  </div>
                                  {act.amount !== undefined && (
                                      <p className={`text-xs font-bold mt-1 ${act.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {act.amount > 0 ? '+' : ''}{currencySymbol}{act.amount.toLocaleString()}
                                      </p>
                                  )}
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="p-6 text-center text-slate-400 text-xs">No recent activity.</div>
                  )}
               </div>
            </div>

            {/* Inventory Quick Look */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
               <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Wheat size={18} className="text-orange-500" /> Feed Levels
               </h3>
               <div className="space-y-4">
                  {criticalFeed.map(item => {
                      // Mock capacity as minLevel * 3 for visualization if no max
                      const maxCap = item.minLevel * 3 || 1000;
                      const pct = Math.min(100, (item.quantity / maxCap) * 100);
                      const isLow = item.quantity <= item.minLevel;

                      return (
                          <div key={item.id}>
                              <div className="flex justify-between text-xs mb-1.5">
                                  <span className="font-bold text-slate-700">{item.name}</span>
                                  <span className={isLow ? 'text-red-500 font-bold' : 'text-slate-500'}>
                                      {item.quantity} {item.unit}
                                  </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-orange-400'}`} 
                                    style={{ width: `${pct}%` }}
                                  ></div>
                              </div>
                          </div>
                      )
                  })}
                  {criticalFeed.length === 0 && (
                      <div className="text-xs text-slate-400 text-center py-4">No feed items tracked.</div>
                  )}
               </div>
               <button 
                 onClick={() => onNavigate('FEED')}
                 className="w-full mt-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold uppercase rounded-lg hover:bg-slate-50 transition-colors"
               >
                  Manage Inventory
               </button>
            </div>

         </div>
      </div>
    </div>
  );
};

export default Dashboard;