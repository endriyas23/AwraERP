import React, { useState, useEffect } from 'react';
import { FarmProfile } from '../types';
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Save, 
  Settings, 
  Shield, 
  Database, 
  Download, 
  RotateCcw,
  Bell,
  CreditCard,
  User,
  LogOut,
  AlertTriangle,
  Globe
} from 'lucide-react';

interface SettingsModuleProps {
  farmProfile: FarmProfile;
  onUpdateProfile: (profile: FarmProfile) => void;
  onResetData: () => void;
  onExportData: () => void;
}

const SettingsModule: React.FC<SettingsModuleProps> = ({ 
  farmProfile, 
  onUpdateProfile,
  onResetData,
  onExportData
}) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'SECURITY' | 'DATA'>('GENERAL');
  
  // Local state for form handling
  const [profileForm, setProfileForm] = useState<FarmProfile>(farmProfile);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize notifications from profile or default
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    lowStock: true,
    mortalityThreshold: true,
    weeklyReport: false,
    ...farmProfile.notifications
  });

  // Sync profile prop updates to local state
  useEffect(() => {
    setProfileForm(farmProfile);
    if (farmProfile.notifications) {
        setNotifications(prev => ({...prev, ...farmProfile.notifications}));
    }
  }, [farmProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: (name === 'taxRateDefault' || name === 'latitude' || name === 'longitude') ? Number(value) : value
    }));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
        ...profileForm,
        notifications // Save current notification state along with profile
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const toggleNotification = (key: string) => {
    const updatedNotifs = { ...notifications, [key]: !notifications[key as keyof typeof notifications] };
    setNotifications(updatedNotifs);
    // Auto-persist when toggling
    onUpdateProfile({
        ...farmProfile,
        notifications: updatedNotifs
    });
  };

  const handleResetConfirm = () => {
    onResetData();
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings & Preferences</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your farm profile, application settings, and data.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Navigation */}
        <div className="lg:w-64 flex-shrink-0">
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <nav className="flex flex-col p-2 space-y-1">
                 <button 
                   onClick={() => setActiveTab('GENERAL')}
                   className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${activeTab === 'GENERAL' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
                 >
                   <Building2 size={18} /> General
                 </button>
                 <button 
                   onClick={() => setActiveTab('SECURITY')}
                   className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${activeTab === 'SECURITY' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
                 >
                   <Shield size={18} /> Users & Security
                 </button>
                 <button 
                   onClick={() => setActiveTab('DATA')}
                   className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${activeTab === 'DATA' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
                 >
                   <Database size={18} /> Data Management
                 </button>
              </nav>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
           {activeTab === 'GENERAL' && (
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="mb-6 pb-4 border-b border-slate-100 flex justify-between items-center">
                   <div>
                      <h2 className="text-lg font-bold text-slate-900">Farm Profile</h2>
                      <p className="text-sm text-slate-500">Update your business details shown on reports and invoices.</p>
                   </div>
                   {saveSuccess && (
                     <span className="text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full animate-in fade-in">
                        Settings Saved!
                     </span>
                   )}
                </div>
                
                <form onSubmit={handleSaveProfile} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="col-span-2">
                         <label className="block text-sm font-medium text-slate-700 mb-1">Farm / Business Name</label>
                         <div className="relative">
                            <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              name="name"
                              value={profileForm.name}
                              onChange={handleInputChange}
                              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                         </div>
                      </div>
                      
                      <div className="col-span-2">
                         <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                         <div className="relative">
                            <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              name="address"
                              value={profileForm.address}
                              onChange={handleInputChange}
                              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                         </div>
                      </div>

                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">City / Region</label>
                         <input 
                           type="text" 
                           name="city"
                           value={profileForm.city}
                           onChange={handleInputChange}
                           className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                         />
                      </div>

                      <div className="col-span-2">
                         <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                               <Globe size={16} className="text-slate-500" /> Geographic Coordinates
                            </h4>
                            <p className="text-xs text-slate-500 mb-4">
                               Used for fetching localized weather forecasts for your dashboard.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Latitude</label>
                                  <input 
                                    type="number" 
                                    step="0.0001"
                                    name="latitude"
                                    value={profileForm.latitude || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                    placeholder="e.g. 9.03"
                                  />
                               </div>
                               <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Longitude</label>
                                  <input 
                                    type="number" 
                                    step="0.0001"
                                    name="longitude"
                                    value={profileForm.longitude || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                    placeholder="e.g. 38.74"
                                  />
                               </div>
                            </div>
                         </div>
                      </div>

                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                         <div className="relative">
                            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="email" 
                              name="email"
                              value={profileForm.email}
                              onChange={handleInputChange}
                              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                         </div>
                      </div>

                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                         <div className="relative">
                            <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              name="phone"
                              value={profileForm.phone}
                              onChange={handleInputChange}
                              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                         </div>
                      </div>

                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Currency Symbol</label>
                         <select 
                           name="currencySymbol"
                           value={profileForm.currencySymbol}
                           onChange={handleInputChange}
                           className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                         >
                            <option value="$">USD ($)</option>
                            <option value="Br">ETB (Br)</option>
                            <option value="₦">NGN (₦)</option>
                            <option value="€">EUR (€)</option>
                            <option value="£">GBP (£)</option>
                            <option value="₵">GHS (₵)</option>
                         </select>
                      </div>

                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Default Tax Rate (%)</label>
                         <input 
                           type="number"
                           step="0.1" 
                           name="taxRateDefault"
                           value={profileForm.taxRateDefault}
                           onChange={handleInputChange}
                           className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                         />
                      </div>
                   </div>

                   <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button 
                        type="submit"
                        className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all"
                      >
                        <Save size={18} /> Save Changes
                      </button>
                   </div>
                </form>
             </div>
           )}

           {activeTab === 'SECURITY' && (
             <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                   <h2 className="text-lg font-bold text-slate-900 mb-4">Application Users</h2>
                   <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                               <th className="px-4 py-3 rounded-l-lg">User</th>
                               <th className="px-4 py-3">Role</th>
                               <th className="px-4 py-3">Status</th>
                               <th className="px-4 py-3 text-right rounded-r-lg">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {/* Empty state or list of users would go here */}
                            <tr>
                               <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                                  No other users found.
                               </td>
                            </tr>
                         </tbody>
                      </table>
                   </div>
                   <button className="mt-4 w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-primary-600 hover:border-primary-300 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                      <User size={16} /> Invite New User
                   </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                   <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Bell size={20} className="text-slate-400"/> Notification Preferences
                   </h2>
                   <div className="space-y-4">
                      {Object.entries(notifications).map(([key, val]) => (
                         <div key={key} className="flex items-center justify-between">
                            <span className="text-sm text-slate-700 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <button 
                              onClick={() => toggleNotification(key)}
                              className={`w-11 h-6 rounded-full transition-colors relative ${val ? 'bg-primary-500' : 'bg-slate-200'}`}
                            >
                               <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${val ? 'left-6' : 'left-1'}`}></div>
                            </button>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'DATA' && (
             <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                   <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                         <Download size={24} />
                      </div>
                      <div>
                         <h3 className="text-lg font-bold text-slate-900">Export System Data</h3>
                         <p className="text-sm text-slate-500 mt-1 mb-4">
                            Download a complete JSON backup of all your farm data, including flocks, financial records, inventory, and staff details.
                         </p>
                         <button 
                           onClick={onExportData}
                           className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition-colors"
                         >
                            Download Backup
                         </button>
                      </div>
                   </div>
                </div>

                <div className="bg-red-50 rounded-xl border border-red-100 shadow-sm p-6">
                   <div className="flex items-start gap-4">
                      <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                         <AlertTriangle size={24} />
                      </div>
                      <div>
                         <h3 className="text-lg font-bold text-red-900">Danger Zone</h3>
                         <p className="text-sm text-red-700 mt-1 mb-4">
                            Resetting the application will delete all current data and restore the initial demo dataset. This action cannot be undone.
                         </p>
                         {!showResetConfirm ? (
                            <button 
                              onClick={() => setShowResetConfirm(true)}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                            >
                               <RotateCcw size={16} /> Reset All Data
                            </button>
                         ) : (
                            <div className="flex items-center gap-3 animate-in fade-in">
                               <span className="text-sm font-bold text-red-800">Are you sure?</span>
                               <button 
                                 onClick={handleResetConfirm}
                                 className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium"
                               >
                                 Yes, Reset
                               </button>
                               <button 
                                 onClick={() => setShowResetConfirm(false)}
                                 className="bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded text-sm font-medium hover:bg-red-50"
                               >
                                 Cancel
                               </button>
                            </div>
                         )}
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModule;