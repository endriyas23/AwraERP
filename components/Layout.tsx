import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Bird, 
  Wheat, 
  Stethoscope, 
  DollarSign, 
  Menu, 
  Bell, 
  User,
  Settings,
  Egg,
  ShoppingBag,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Trash2,
  LogOut,
  ChevronDown,
  Camera,
  Mail,
  Phone,
  Lock,
  Save
} from 'lucide-react';
import { ViewState, AppNotification, CurrentUser } from '../types';
import { NAV_ITEMS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  notifications?: AppNotification[];
  onMarkAsRead?: (id: string) => void;
  onClearAllNotifications?: () => void;
  currentUser?: CurrentUser;
  onUpdateUser?: (user: CurrentUser, newPassword?: string) => void;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  onNavigate,
  notifications = [],
  onMarkAsRead,
  onClearAllNotifications,
  currentUser,
  onUpdateUser,
  onLogout
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState<Partial<CurrentUser>>({});
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (currentUser) {
      setProfileForm(currentUser);
    }
  }, [currentUser, isProfileModalOpen]);

  // Close panels when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateUser && currentUser) {
      onUpdateUser({
        ...currentUser,
        ...profileForm
      } as CurrentUser, newPassword);
    }
    setIsProfileModalOpen(false);
    setNewPassword('');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard size={20} />;
      case 'Bird': return <Bird size={20} />;
      case 'Wheat': return <Wheat size={20} />;
      case 'Stethoscope': return <Stethoscope size={20} />;
      case 'DollarSign': return <DollarSign size={20} />;
      case 'Egg': return <Egg size={20} />;
      case 'ShoppingBag': return <ShoppingBag size={20} />;
      case 'Users': return <Users size={20} />;
      default: return <LayoutDashboard size={20} />;
    }
  };

  const getNotifIcon = (type: string) => {
    switch(type) {
      case 'SUCCESS': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'WARNING': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'ERROR': return <AlertTriangle size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside 
        className={`bg-slate-900 text-white transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-800">
          {isSidebarOpen ? (
             <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
               <div className="bg-primary-500 rounded-lg p-1">
                 <Bird className="text-white" size={24} />
               </div>
               <span className="text-white">Awra<span className="text-primary-400">ERP</span></span>
             </div>
          ) : (
             <div className="bg-primary-500 rounded-lg p-1">
               <Bird className="text-white" size={24} />
             </div>
          )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as ViewState)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group relative
                ${currentView === item.id 
                  ? 'bg-primary-600 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className={currentView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}>
                {getIcon(item.icon)}
              </span>
              {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
              
              {!isSidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button 
             onClick={() => onNavigate('SETTINGS')}
             className={`flex items-center gap-3 w-full transition-colors ${currentView === 'SETTINGS' ? 'text-white font-medium' : 'text-slate-400 hover:text-white'}`}
           >
             <Settings size={20} />
             {isSidebarOpen && <span className="text-sm font-medium">Settings</span>}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-4">
             {/* Notification Bell */}
             <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors relative"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                  )}
                </button>

                {/* Notification Panel */}
                {isNotifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                     <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                        {notifications.length > 0 && (
                          <button 
                            onClick={onClearAllNotifications}
                            className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors"
                          >
                            <Trash2 size={12} /> Clear all
                          </button>
                        )}
                     </div>
                     <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map(n => (
                            <div 
                              key={n.id} 
                              className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                              onClick={() => onMarkAsRead && onMarkAsRead(n.id)}
                            >
                               <div className={`mt-1 p-1.5 rounded-full h-fit shrink-0 ${
                                 n.type === 'SUCCESS' ? 'bg-green-100' :
                                 n.type === 'WARNING' ? 'bg-orange-100' :
                                 n.type === 'ERROR' ? 'bg-red-100' : 'bg-blue-100'
                               }`}>
                                 {getNotifIcon(n.type)}
                               </div>
                               <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                     <h4 className={`text-sm font-semibold ${!n.isRead ? 'text-slate-900' : 'text-slate-600'}`}>{n.title}</h4>
                                     {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5"></div>}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                                  <p className="text-[10px] text-slate-400 mt-1">{n.timestamp}</p>
                               </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-400">
                             <Bell size={24} className="mx-auto mb-2 opacity-20" />
                             <p className="text-xs">No notifications yet.</p>
                          </div>
                        )}
                     </div>
                  </div>
                )}
             </div>

             {/* User Profile */}
             <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-3 p-1.5 pr-3 hover:bg-slate-100 rounded-full transition-colors group"
                >
                   <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-semibold border border-slate-300 overflow-hidden">
                     {currentUser?.avatar ? (
                       <img src={currentUser.avatar} alt="User" className="w-full h-full object-cover" />
                     ) : (
                       <span>{currentUser?.name?.substring(0, 2).toUpperCase() || <User size={16} />}</span>
                     )}
                   </div>
                   <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-slate-900 leading-none">{currentUser?.name || 'Guest'}</p>
                      <p className="text-[10px] text-slate-500 leading-none mt-1">{currentUser?.role || 'Visitor'}</p>
                   </div>
                   <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                     <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <p className="font-bold text-slate-900">{currentUser?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                     </div>
                     <div className="p-1">
                        <button 
                          onClick={() => { setIsProfileModalOpen(true); setIsUserMenuOpen(false); }}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                           <User size={16} className="text-slate-400" /> My Profile
                        </button>
                        <button 
                          onClick={() => { onNavigate('SETTINGS'); setIsUserMenuOpen(false); }}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                           <Settings size={16} className="text-slate-400" /> Farm Settings
                        </button>
                        <div className="h-px bg-slate-100 my-1"></div>
                        <button 
                          onClick={() => { if(onLogout) onLogout(); setIsUserMenuOpen(false); }}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                           <LogOut size={16} /> Sign Out
                        </button>
                     </div>
                  </div>
                )}
             </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50 p-6">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                 <h3 className="font-bold text-lg text-slate-900">Edit Profile</h3>
                 <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-200 transition-colors">
                   <X size={20} />
                 </button>
              </div>
              
              <form onSubmit={handleProfileSubmit} className="p-6 space-y-6">
                 {/* Avatar Section */}
                 <div className="flex flex-col items-center">
                    <div className="relative group cursor-pointer">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleAvatarChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                        <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-3xl border-4 border-white shadow-sm overflow-hidden relative">
                           {profileForm.avatar ? (
                             <img src={profileForm.avatar} alt="Profile" className="w-full h-full object-cover" />
                           ) : (
                             <span>{profileForm.name?.substring(0, 2).toUpperCase()}</span>
                           )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                           <Camera size={24} className="text-white" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Click to change photo</p>
                 </div>

                 <div className="space-y-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                       <div className="relative">
                          <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            value={profileForm.name || ''}
                            onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                       </div>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                       <div className="relative">
                          <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="email" 
                            value={profileForm.email || ''}
                            onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                       </div>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                       <div className="relative">
                          <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="tel" 
                            value={profileForm.phone || ''}
                            onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                       </div>
                    </div>
                    
                    <div className="pt-2">
                       <label className="block text-sm font-medium text-slate-700 mb-1">Change Password</label>
                       <div className="relative">
                          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="password" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password (optional)"
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setIsProfileModalOpen(false)}
                      className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold border border-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <Save size={18} /> Save Changes
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Layout;