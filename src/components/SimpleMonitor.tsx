import React, { useState } from 'react';
import { Group, Service, CheckHistory, Alert } from '../types.js';
import { ShieldCheck, ShieldAlert, Search, RefreshCw, Layers, CheckCircle2, XCircle, BarChart3, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface SimpleMonitorProps {
  groups: Group[];
  services: Service[];
  history: CheckHistory[];
  alerts: Alert[];
  onTriggerAllChecks: () => Promise<void>;
}

export default function SimpleMonitor({ groups, services, history, alerts, onTriggerAllChecks }: SimpleMonitorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'UP' | 'WARN' | 'DOWN' | 'ALERTS'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onTriggerAllChecks();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculations for KPIs
  const totalServices = services.length;
  const upServicesCount = services.filter(s => s.status === 'UP').length;
  const downServicesCount = services.filter(s => s.status === 'DOWN').length;
  const warnServicesCount = services.filter(s => s.status === 'WARN').length;
  const unresolvedAlertsCount = alerts.filter(a => !a.resolved).length;

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          service.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroupId === 'ALL' || service.groupId === selectedGroupId;
    
    let matchesStatus = true;
    if (selectedStatus === 'UP') {
      matchesStatus = service.status === 'UP';
    } else if (selectedStatus === 'WARN') {
      matchesStatus = service.status === 'WARN';
    } else if (selectedStatus === 'DOWN') {
      matchesStatus = service.status === 'DOWN';
    } else if (selectedStatus === 'ALERTS') {
      const hasUnresolvedAlert = alerts.some(a => !a.resolved && a.serviceId === service.id);
      matchesStatus = service.status === 'WARN' || hasUnresolvedAlert;
    }

    return matchesSearch && matchesGroup && matchesStatus;
  });

  return (
    <div className="space-y-6" id="simple-monitor-panel">
      {/* KPI Cards Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total services */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'ALL' ? 'ALL' : 'ALL')}
          className={`cursor-pointer rounded-2xl p-4 shadow-sm flex items-center justify-between transition-all duration-200 border ${
            selectedStatus === 'ALL' 
              ? 'border-indigo-500 bg-indigo-50/20 shadow-md shadow-indigo-100/30' 
              : 'border-slate-100 bg-white hover:border-slate-300'
          }`}
        >
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">کل وب‌سرویس‌ها</span>
            <span id="kpi-total-services-mon" className="text-xl font-black text-slate-800 font-mono mt-1 block">
              {totalServices}
            </span>
          </div>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        {/* UP Services */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'UP' ? 'ALL' : 'UP')}
          className={`cursor-pointer rounded-2xl p-4 shadow-sm flex items-center justify-between transition-all duration-200 border ${
            selectedStatus === 'UP' 
              ? 'border-emerald-500 bg-emerald-50/20 shadow-md shadow-emerald-100/30 ring-2 ring-emerald-500/20' 
              : 'border-slate-100 bg-white hover:border-slate-300'
          }`}
        >
          <div>
            <span className="text-[10px] text-emerald-600 font-bold block">در دسترس (UP)</span>
            <span id="kpi-up-services-mon" className="text-xl font-black text-emerald-600 font-mono mt-1 block">
              {upServicesCount}
            </span>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* WARN Services */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'WARN' ? 'ALL' : 'WARN')}
          className={`cursor-pointer rounded-2xl p-4 shadow-sm flex items-center justify-between transition-all duration-200 border ${
            selectedStatus === 'WARN' 
              ? 'border-amber-500 bg-amber-50/20 shadow-md shadow-amber-100/30 ring-2 ring-amber-500/20' 
              : 'border-slate-100 bg-white hover:border-slate-300'
          }`}
        >
          <div>
            <span className="text-[10px] text-amber-600 font-bold block">افت سرعت (WARN)</span>
            <span id="kpi-warn-services-mon" className="text-xl font-black text-amber-600 font-mono mt-1 block">
              {warnServicesCount}
            </span>
          </div>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        {/* DOWN Services */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'DOWN' ? 'ALL' : 'DOWN')}
          className={`cursor-pointer rounded-2xl p-4 shadow-sm flex items-center justify-between transition-all duration-200 border ${
            selectedStatus === 'DOWN' 
              ? 'border-rose-500 bg-rose-50/20 shadow-md shadow-rose-100/30 ring-2 ring-rose-500/20' 
              : 'border-slate-100 bg-white hover:border-slate-300'
          }`}
        >
          <div>
            <span className="text-[10px] text-rose-600 font-bold block">قطع سرویس (DOWN)</span>
            <span id="kpi-down-services-mon" className="text-xl font-black text-rose-600 font-mono mt-1 block">
              {downServicesCount}
            </span>
          </div>
          <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        {/* Active Alerts */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'ALERTS' ? 'ALL' : 'ALERTS')}
          className={`col-span-2 md:col-span-1 cursor-pointer rounded-2xl p-4 shadow-sm flex items-center justify-between transition-all duration-200 border ${
            selectedStatus === 'ALERTS' 
              ? 'border-rose-500 bg-rose-50/20 shadow-md shadow-rose-100/30 ring-2 ring-rose-500/20' 
              : 'border-slate-100 bg-white hover:border-slate-300'
          }`}
        >
          <div>
            <span className="text-[10px] text-slate-500 font-bold block">هشدارهای فعال</span>
            <span id="kpi-active-alerts-mon" className="text-xl font-black text-rose-500 font-mono mt-1 block">
              {unresolvedAlertsCount}
            </span>
          </div>
          <div className={`p-2 rounded-xl ${unresolvedAlertsCount > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Grid of Minimal Status Indicators */}
      <div className="flex flex-wrap justify-center sm:justify-start gap-4">
        {filteredServices.map((service) => {
          // Find latest check history for this service
          const serviceHistory = history
            .filter((h) => h.serviceId === service.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          const latest = serviceHistory[0];
          const type = service.monitorType || (service.monitorField ? 'FIELD_MATCH' : 'STATUS_ONLY');

          // Determine successful or not
          let isSuccessful = true;
          if (type === 'STATUS_ONLY') {
            isSuccessful = latest 
              ? (latest.statusCode === 200 || latest.status === 'UP') 
              : (service.status === 'UP');
          } else if (type === 'FIELD_MATCH') {
            isSuccessful = latest 
              ? String(latest.fieldValue) === String(service.expectedValue)
              : (service.status === 'UP');
          }

          const isStatistical = type === 'STATISTICAL';
          const isWarn = service.status === 'WARN';
          const isDown = service.status === 'DOWN' || (!isStatistical && !isSuccessful);
          const isUp = service.status === 'UP' || (!isStatistical && isSuccessful && !isWarn && !isDown);

          return (
            <motion.div
              key={service.id}
              layout
              className={`w-[150px] h-[150px] min-w-[150px] min-h-[150px] max-w-[150px] max-h-[150px] border rounded-2xl p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between items-center text-center relative overflow-hidden ${
                isWarn
                  ? 'border-amber-200 bg-amber-50/10'
                  : isDown
                    ? 'border-rose-100 bg-rose-50/5'
                    : isUp
                      ? 'border-emerald-100 bg-emerald-50/5'
                      : 'border-slate-200 bg-slate-50/5'
              }`}
            >
              {/* Subtle top bar decorative line */}
              <div className={`absolute top-0 right-0 left-0 h-1 ${
                isWarn
                  ? 'bg-amber-500'
                  : isDown
                    ? 'bg-rose-500'
                    : isUp
                      ? 'bg-emerald-500'
                      : 'bg-slate-400'
              }`} />

              {/* Service Name */}
              <div className="w-full mt-1 px-1">
                <h3 className="text-xs font-black text-slate-800 tracking-tight leading-snug line-clamp-2" title={service.name}>
                  {service.name}
                </h3>
              </div>

              {/* Status and Result Section */}
              <div className="flex-1 flex items-center justify-center w-full my-1">
                {isStatistical ? (
                  // Statistical displays value in a 90x90 elegant rounded square card
                  <div className={`w-[90px] h-[90px] min-w-[90px] min-h-[90px] rounded-2xl flex flex-col items-center justify-center shadow-sm ${
                    isWarn
                      ? 'bg-amber-50 border border-amber-200 text-amber-800 shadow-amber-100/30'
                      : isDown
                        ? 'bg-rose-50 border border-rose-100 text-rose-800 shadow-rose-100/30'
                        : 'bg-emerald-50 border border-emerald-100 text-emerald-800 shadow-emerald-100/30'
                  }`}>
                    <span className={`text-[9px] font-bold mb-0.5 ${
                      isWarn ? 'text-amber-500' : isDown ? 'text-rose-500' : 'text-emerald-500'
                    }`}>
                      {isWarn ? 'هشدار رنج' : isDown ? 'قطع/نامعتبر' : 'مقدار عددی'}
                    </span>
                    <span className="text-lg font-black font-mono truncate max-w-[80px]" title={latest && latest.fieldValue !== undefined ? String(latest.fieldValue) : '---'}>
                      {latest && latest.fieldValue !== undefined ? String(latest.fieldValue) : '---'}
                    </span>
                  </div>
                ) : (
                  // Non-statistical displays clear Green/Red success or fail circle badges in a 90x90 element
                  <div className="flex items-center justify-center w-[90px] h-[90px] min-w-[90px] min-h-[90px]">
                    {isSuccessful ? (
                      <div className="flex flex-col items-center justify-center bg-emerald-500 text-white w-[84px] h-[84px] rounded-full shadow-lg shadow-emerald-100 animate-pulse gap-1">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                        <span className="text-xs font-black">موفق</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center bg-rose-500 text-white w-[84px] h-[84px] rounded-full shadow-lg shadow-rose-100 gap-1">
                        <XCircle className="w-6 h-6 text-white" />
                        <span className="text-xs font-black">خطا</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mini subtle footer showing time */}
              <div className="w-full text-[9px] text-slate-400 font-mono mt-auto leading-none">
                {latest 
                  ? new Date(latest.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) 
                  : '---'}
              </div>
            </motion.div>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
            <p className="text-xs text-slate-400 font-bold">هیچ وب‌سرویسی با معیارهای مورد نظر یافت نشد.</p>
          </div>
        )}
      </div>
    </div>
  );
}
