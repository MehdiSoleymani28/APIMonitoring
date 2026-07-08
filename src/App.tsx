import React, { useState, useEffect } from 'react';
import { Group, Service, CheckHistory, Alert, MockEndpoint } from './types.js';
import GroupManager from './components/GroupManager.js';
import ServiceCreator from './components/ServiceCreator.js';
import RealtimeDashboard from './components/RealtimeDashboard.js';
import MockApiManager from './components/MockApiManager.js';
import SimpleMonitor from './components/SimpleMonitor.js';
import { Activity, LayoutDashboard, Settings, Server, Clock, ShieldCheck, AlertOctagon, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ActiveTab = 'dashboard' | 'simple-monitor' | 'config' | 'mock-api';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Dark mode class sync effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // App data states
  const [groups, setGroups] = useState<Group[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [history, setHistory] = useState<CheckHistory[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [mockEndpoints, setMockEndpoints] = useState<MockEndpoint[]>([]);

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Initial fetch on mount
  useEffect(() => {
    fetchAllData();
    
    // Setup clock timer
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Dynamic state polling (every 2.5 seconds) to simulate real-time updates!
    const pollTimer = setInterval(() => {
      fetchPollingData();
    }, 2500);

    return () => {
      clearInterval(clockTimer);
      clearInterval(pollTimer);
    };
  }, []);

  const fetchAllData = async () => {
    try {
      const [groupsRes, servicesRes, historyRes, alertsRes, mockRes] = await Promise.all([
        fetch('/api/groups').then(r => r.json()),
        fetch('/api/services').then(r => r.json()),
        fetch('/api/history').then(r => r.json()),
        fetch('/api/alerts').then(r => r.json()),
        fetch('/api/mock-endpoints').then(r => r.json())
      ]);

      setGroups(groupsRes);
      setServices(servicesRes);
      setHistory(historyRes);
      setAlerts(alertsRes);
      setMockEndpoints(mockRes);
    } catch (err) {
      console.error('Error fetching system configuration data:', err);
    }
  };

  // Poll only lightweight, rapid changing status data
  const fetchPollingData = async () => {
    try {
      const [servicesRes, historyRes, alertsRes] = await Promise.all([
        fetch('/api/services').then(r => r.json()),
        fetch('/api/history').then(r => r.json()),
        fetch('/api/alerts').then(r => r.json())
      ]);

      setServices(servicesRes);
      setHistory(historyRes);
      setAlerts(alertsRes);
    } catch (err) {
      console.error('Error polling real-time metrics:', err);
    }
  };

  // 1. Group operations
  const handleAddGroup = async (name: string, token: string) => {
    const response = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, token })
    });
    if (response.ok) {
      const newGroup = await response.json();
      setGroups([...groups, newGroup]);
    }
  };

  const handleUpdateToken = async (groupId: string, token: string) => {
    const response = await fetch(`/api/groups/${groupId}/token`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (response.ok) {
      const updatedGroup = await response.json();
      setGroups(groups.map(g => g.id === groupId ? updatedGroup : g));
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const response = await fetch(`/api/groups/${groupId}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      setGroups(groups.filter(g => g.id !== groupId));
      // Since deleting a group cascadingly deletes its services, let's update local services/history/alerts
      setServices(services.filter(s => s.groupId !== groupId));
      const servicesInGroup = services.filter(s => s.groupId === groupId).map(s => s.id);
      setHistory(history.filter(h => !servicesInGroup.includes(h.serviceId)));
      setAlerts(alerts.filter(a => !servicesInGroup.includes(a.serviceId)));
    }
  };

  // 2. Service operations
  const handleAddService = async (serviceData: any) => {
    const response = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serviceData)
    });
    if (response.ok) {
      const newService = await response.json();
      setServices([...services, newService]);
      // Refetch history and alerts
      fetchPollingData();
    }
  };

  const handleUpdateService = async (serviceId: string, serviceData: any) => {
    const response = await fetch(`/api/services/${serviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serviceData)
    });
    if (response.ok) {
      const updatedService = await response.json();
      setServices(services.map(s => s.id === serviceId ? updatedService : s));
      // Refetch history and alerts
      fetchPollingData();
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    const response = await fetch(`/api/services/${serviceId}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      setServices(services.filter(s => s.id !== serviceId));
      setHistory(history.filter(h => h.serviceId !== serviceId));
      setAlerts(alerts.filter(a => a.serviceId !== serviceId));
    }
  };

  // 3. Alert operations
  const handleResolveAlert = async (alertId: string) => {
    const response = await fetch(`/api/alerts/${alertId}/resolve`, {
      method: 'POST'
    });
    if (response.ok) {
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a));
    }
  };

  const handleResolveAllAlerts = async () => {
    const response = await fetch('/api/alerts/resolve-all', {
      method: 'POST'
    });
    if (response.ok) {
      setAlerts(alerts.map(a => ({ ...a, resolved: true })));
    }
  };

  // 4. Trigger manual checks
  const handleTriggerAllChecks = async () => {
    const response = await fetch('/api/run-all-checks', {
      method: 'POST'
    });
    if (response.ok) {
      await fetchPollingData();
    }
  };

  // 5. Mock Endpoints operations
  const handleAddMock = async (path: string, status: number, delay: number, body: string) => {
    const response = await fetch('/api/mock-endpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, status, responseTimeDelay: delay, responseBody: body })
    });
    if (response.ok) {
      const newMock = await response.json();
      setMockEndpoints([...mockEndpoints, newMock]);
    }
  };

  const handleUpdateMock = async (id: string, updateData: Partial<MockEndpoint>) => {
    const response = await fetch(`/api/mock-endpoints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    if (response.ok) {
      const updatedMock = await response.json();
      setMockEndpoints(mockEndpoints.map(m => m.id === id ? updatedMock : m));
    }
  };

  // Date and Time formatter
  const formattedTimeStr = currentTime.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDateStr = currentTime.toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Count active/unresolved alerts
  const activeAlertsCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-100 pb-12">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo & System running status */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight">سامانه پایش هوشمند وب‌سرویس‌ها (Web Service Monitor)</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute"></span>
                <span className="text-[10px] text-emerald-600 font-medium mr-1.5">موتور مانیتورینگ آنلاین است</span>
              </div>
            </div>
          </div>

          {/* Time, Date and Theme Toggle Section */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              id="btn-toggle-theme"
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-50/80 hover:bg-indigo-50/20 rounded-xl border border-slate-100 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={darkMode ? "تغییر به حالت روشن" : "تغییر به حالت تاریک"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500 transition-transform duration-500 hover:rotate-90" /> : <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-500 hover:-rotate-12" />}
            </button>

            {/* Time and Date Section */}
            <div className="flex items-center gap-4 bg-slate-50/80 px-4 py-1.5 rounded-xl border border-slate-100">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-medium">{formattedDateStr}</p>
                <p className="text-xs font-black font-mono text-slate-700 text-center sm:text-left mt-0.5">{formattedTimeStr}</p>
              </div>
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Menu Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3">
        <div className="bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <nav className="flex gap-1 w-full sm:w-auto overflow-x-auto scrollbar-none">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              داشبورد وضعیت لحظه‌ای
            </button>

            <button
              id="tab-simple-monitor"
              onClick={() => setActiveTab('simple-monitor')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
                activeTab === 'simple-monitor'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              صفحه مانیتور وضعیت‌ها
            </button>

            <button
              id="tab-config"
              onClick={() => setActiveTab('config')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
                activeTab === 'config'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              <Settings className="w-4 h-4" />
              پیکربندی مانیتورینگ
            </button>

            <button
              id="tab-mock-api"
              onClick={() => setActiveTab('mock-api')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
                activeTab === 'mock-api'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              <Server className="w-4 h-4" />
              شبیه‌ساز خطا (Mock API)
            </button>
          </nav>

          {/* Quick Stats Summary */}
          <div className="flex gap-4 text-[10px] text-slate-500 font-bold px-4 border-r border-slate-100 h-full">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 flex items-center justify-center text-[8px] text-white">
                {services.length}
              </span>
              <span>وب‌سرویس پایش شونده</span>
            </div>
            {activeAlertsCount > 0 && (
              <div className="flex items-center gap-1.5 text-rose-600">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>{activeAlertsCount} هشدار فعال</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Content with custom animations */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <RealtimeDashboard
                groups={groups}
                services={services}
                history={history}
                alerts={alerts}
                onDeleteService={handleDeleteService}
                onTriggerAllChecks={handleTriggerAllChecks}
                onResolveAlert={handleResolveAlert}
                onResolveAllAlerts={handleResolveAllAlerts}
              />
            </motion.div>
          )}

          {activeTab === 'simple-monitor' && (
            <motion.div
              key="simple-monitor"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <SimpleMonitor
                groups={groups}
                services={services}
                history={history}
                alerts={alerts}
                onTriggerAllChecks={handleTriggerAllChecks}
              />
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 animate-fade-in"
            >
              {/* Group definition & Daily tokens manager */}
              <GroupManager
                groups={groups}
                onAddGroup={handleAddGroup}
                onUpdateToken={handleUpdateToken}
                onDeleteGroup={handleDeleteGroup}
              />

              {/* Service Creator & Response JSON analyzer */}
              <ServiceCreator
                groups={groups}
                services={services}
                onAddService={handleAddService}
                onUpdateService={handleUpdateService}
                mockEndpoints={mockEndpoints}
              />
            </motion.div>
          )}

          {activeTab === 'mock-api' && (
            <motion.div
              key="mock-api"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <MockApiManager
                mockEndpoints={mockEndpoints}
                onUpdateMock={handleUpdateMock}
                onAddMock={handleAddMock}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
