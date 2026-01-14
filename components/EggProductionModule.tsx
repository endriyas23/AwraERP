import React, { useMemo } from 'react';
import { Flock, InventoryItem, InventoryCategory } from '../types';
import { 
  Plus, 
  Egg,
  Package,
  TrendingUp,
  Percent,
  Activity,
  BarChart3
} from 'lucide-react';

interface EggProductionModuleProps {
  flock: Flock;
  inventoryItems: InventoryItem[];
  onRequestRecord: () => void;
}

const EggProductionModule: React.FC<EggProductionModuleProps> = ({ 
  flock, 
  inventoryItems,
  onRequestRecord
}) => {
  // Find linked inventory item for stock display
  const eggInventory = inventoryItems.find(i => i.name === 'Table Eggs' && i.category === InventoryCategory.OTHER);

  // Process Logs to calculate daily stats accurately
  const processedData = useMemo(() => {
    // 1. Sort logs chronologically to track population changes
    const sortedLogs = [...flock.logs].sort((a, b) => a.day - b.day);
    
    let cumulativeMortality = 0;
    
    // 2. Map logs to include population snapshot and calculated metrics
    const enrichedLogs = sortedLogs.map(log => {
      // Birds alive at start of this day = Initial - Mortality occurring before today
      // (Simplified: assuming logs are sequential. For strictly accurate 'Hen Day', we use birds present.)
      const birdsAlive = flock.initialCount - cumulativeMortality;
      
      const totalEggs = log.eggProduction || 0;
      
      // Hen Day % = (Daily Eggs / Birds Alive that day) * 100
      const henDayPct = birdsAlive > 0 ? (totalEggs / birdsAlive) * 100 : 0;
      
      // Hen Housed % = (Daily Eggs / Initial Birds) * 100
      const henHousedPct = flock.initialCount > 0 ? (totalEggs / flock.initialCount) * 100 : 0;

      // Update cumulative mortality for the NEXT day
      cumulativeMortality += (log.mortality || 0);

      // Parse efficiency/rejection from eggDetails if available
      const details = log.eggDetails;
      const rejected = (details?.morning.damaged || 0) + (details?.afternoon.damaged || 0);
      const saleable = Math.max(0, totalEggs - rejected);
      const qualityPct = totalEggs > 0 ? (saleable / totalEggs) * 100 : 0;

      return {
        ...log,
        birdsAlive,
        henDayPct,
        henHousedPct,
        rejected,
        saleable,
        qualityPct
      };
    });

    // 3. Reverse for display (Newest first)
    return enrichedLogs.reverse();
  }, [flock]);

  // Filter only logs with actual production for averages
  const productionLogs = processedData.filter(l => (l.eggProduction || 0) > 0);

  // Summary Calculations
  const totalProduction = processedData.reduce((acc, l) => acc + (l.eggProduction || 0), 0);
  const avgHenDay = productionLogs.length > 0 
    ? productionLogs.reduce((acc, l) => acc + l.henDayPct, 0) / productionLogs.length 
    : 0;
  const avgHenHoused = productionLogs.length > 0 
    ? productionLogs.reduce((acc, l) => acc + l.henHousedPct, 0) / productionLogs.length 
    : 0;
  const maxProd = Math.max(...productionLogs.map(l => l.eggProduction || 0));

  return (
    <div className="space-y-6">
       
       {/* Metrics Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* Inventory Card */}
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex justify-between items-start mb-2">
                   <div>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory Stock</p>
                       <h3 className="text-2xl font-bold text-slate-900 mt-1">
                           {eggInventory ? eggInventory.quantity.toLocaleString() : '0'} 
                       </h3>
                   </div>
                   <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                       <Package size={20} />
                   </div>
               </div>
               <div className="text-xs text-slate-500">
                   {eggInventory ? `Est. Value: $${(eggInventory.quantity * eggInventory.costPerUnit).toFixed(2)}` : 'Not tracked'}
               </div>
           </div>

           {/* Total Production */}
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex justify-between items-start mb-2">
                   <div>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Produced</p>
                       <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalProduction.toLocaleString()}</h3>
                   </div>
                   <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                       <TrendingUp size={20} />
                   </div>
               </div>
               <div className="text-xs text-slate-500">Lifetime count</div>
           </div>

           {/* Avg Hen Day % */}
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex justify-between items-start mb-2">
                   <div>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Hen Day %</p>
                       <h3 className="text-2xl font-bold text-slate-900 mt-1">{avgHenDay.toFixed(1)}%</h3>
                   </div>
                   <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                       <Activity size={20} />
                   </div>
               </div>
               <div className="text-xs text-slate-500">Efficiency (Live Birds)</div>
           </div>

           {/* Avg Hen Housed % */}
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex justify-between items-start mb-2">
                   <div>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Hen Housed %</p>
                       <h3 className="text-2xl font-bold text-slate-900 mt-1">{avgHenHoused.toFixed(1)}%</h3>
                   </div>
                   <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                       <BarChart3 size={20} />
                   </div>
               </div>
               <div className="text-xs text-slate-500">Efficiency (Initial Flock)</div>
           </div>
       </div>

       {/* Toolbar */}
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
           <div>
               <h3 className="text-lg font-bold text-slate-900">Daily Production Log</h3>
               <p className="text-sm text-slate-500">Detailed performance metrics per day.</p>
           </div>
           <button 
             onClick={onRequestRecord}
             className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
           >
             <Plus size={18} /> Record Production
           </button>
       </div>

       {/* Data Table */}
       <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Birds Alive</th>
                  <th className="px-6 py-4 text-center">Total Eggs</th>
                  <th className="px-6 py-4 text-center">Hen Day %</th>
                  <th className="px-6 py-4 text-center">Hen Housed %</th>
                  <th className="px-6 py-4 text-right">Saleable</th>
                  <th className="px-6 py-4 text-right">Rejected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedData.length > 0 ? (
                  processedData.map((row) => {
                    const isProductionDay = (row.eggProduction || 0) > 0;
                    
                    return (
                      <tr key={row.day} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{row.date}</div>
                          <div className="text-xs text-slate-400">Day {row.day}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {row.birdsAlive.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className={`font-bold ${isProductionDay ? 'text-slate-800' : 'text-slate-300'}`}>
                             {(row.eggProduction || 0).toLocaleString()}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                           {isProductionDay ? (
                             <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                               row.henDayPct > 90 ? 'bg-green-100 text-green-700' :
                               row.henDayPct > 80 ? 'bg-blue-100 text-blue-700' :
                               'bg-yellow-100 text-yellow-700'
                             }`}>
                               {row.henDayPct.toFixed(1)}%
                             </span>
                           ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-600">
                           {isProductionDay ? `${row.henHousedPct.toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-green-600 font-medium">
                          {row.saleable > 0 ? row.saleable.toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-red-500">
                          {row.rejected > 0 ? row.rejected : '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                       <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Egg size={24} className="text-yellow-400" />
                       </div>
                       <p>No egg production records found.</p>
                       <p className="text-xs mt-1">Click "Record Production" to add data.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
         </div>
       </div>
    </div>
  );
};

export default EggProductionModule;