import React, { useState } from 'react';
import { Group, Service, CheckHistory, Alert } from '../types.js';
import { Play, Activity, CheckCircle2, AlertTriangle, XCircle, Trash2, ShieldAlert, Clock, RefreshCw, Layers, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RealtimeDashboardProps {
  groups: Group[];
  services: Service[];
  history: CheckHistory[];
  alerts: Alert[];
  onDeleteService: (serviceId: string) => Promise<void>;
  onTriggerAllChecks: () => Promise<void>;
  onResolveAlert: (alertId: string) => Promise<void>;
  onResolveAllAlerts: () => Promise<void>;
}

export default function RealtimeDashboard({
  groups,
  services,
  history,
  alerts,
  onDeleteService,
  onTriggerAllChecks,
  onResolveAlert,
  onResolveAllAlerts
}: RealtimeDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGroupIdFilter, setSelectedGroupIdFilter] = useState<string>('all');
  const [selectedServiceIdFilter, setSelectedServiceIdFilter] = useState<string>('all');

  const handleRefresh = async () => {
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

  // Filtered services list
  const filteredServices = services.filter(s => {
    const matchGroup = selectedGroupIdFilter === 'all' || s.groupId === selectedGroupIdFilter;
    const matchService = selectedServiceIdFilter === 'all' || s.id === selectedServiceIdFilter;
    return matchGroup && matchService;
  });

  // Fetch group name helper
  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'نامشخص';
  };

  // Helper to format ISO string to local Persian-friendly time
  const formatTime = (isoStr?: string) => {
    if (!isoStr) return '--:--';
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return isoStr;
    }
  };

  // Helper to format full date and time
  const formatDateTime = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('fa-IR', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  };

  // Generates sparkline history data for a specific service (last 10 checks)
  const getServiceHistory = (serviceId: string): CheckHistory[] => {
    return history
      .filter(h => h.serviceId === serviceId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-10); // get last 10 entries
  };

  return (
    <div id="realtime-dashboard-panel" className="space-y-6">
      {/* KPI Cards Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total services */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">کل وب‌سرویس‌ها</span>
            <span id="kpi-total-services" className="text-2xl font-black text-slate-800 font-mono mt-1 block">
              {totalServices}
            </span>
          </div>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* UP Services */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-emerald-600 font-bold block">در دسترس (UP)</span>
            <span id="kpi-up-services" className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
              {upServicesCount}
            </span>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* WARN Services */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-amber-600 font-bold block">افت سرعت (WARN)</span>
            <span id="kpi-warn-services" className="text-2xl font-black text-amber-600 font-mono mt-1 block">
              {warnServicesCount}
            </span>
          </div>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* DOWN Services */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-rose-600 font-bold block">قطع سرویس (DOWN)</span>
            <span id="kpi-down-services" className="text-2xl font-black text-rose-600 font-mono mt-1 block">
              {downServicesCount}
            </span>
          </div>
          <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Active Alerts */}
        <div className="col-span-2 md:col-span-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block">هشدارهای فعال</span>
            <span id="kpi-active-alerts" className="text-2xl font-black text-rose-500 font-mono mt-1 block">
              {unresolvedAlertsCount}
            </span>
          </div>
          <div className={`p-2 rounded-xl ${unresolvedAlertsCount > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Services on Left, Alerts & Logs on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services Latency & Status monitoring */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            {/* Header filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4.5 h-4.5 text-indigo-600" />
                  بررسی لحظه‌ای و نمودار سلامت وب‌سرویس‌ها
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  پایش دائم پاسخ، سرعت و کدهای وضعیت وب‌سرویس‌های رجیستر شده.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-refresh-manual"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'در حال پایش...' : 'بررسی مجدد همین حالا'}
                </button>
              </div>
            </div>

            {/* Filters selectors */}
            <div className="flex flex-wrap gap-2 mb-4 bg-slate-50 p-2 rounded-xl text-xs">
              <div>
                <select
                  value={selectedGroupIdFilter}
                  onChange={(e) => setSelectedGroupIdFilter(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-medium text-slate-700"
                >
                  <option value="all">همه گروه‌ها</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedServiceIdFilter}
                  onChange={(e) => setSelectedServiceIdFilter(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-medium text-slate-700"
                >
                  <option value="all">همه وب‌سرویس‌ها</option>
                  {services
                    .filter(s => selectedGroupIdFilter === 'all' || s.groupId === selectedGroupIdFilter)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>

            {/* Services List cards */}
            <div className="space-y-4">
              {filteredServices.map(service => {
                const svcHistory = getServiceHistory(service.id);
                const latestHistory = svcHistory[svcHistory.length - 1];

                let statusColor = 'bg-slate-100 border-slate-200 text-slate-600';
                let statusBg = 'bg-slate-50';
                if (service.status === 'UP') {
                  statusColor = 'bg-emerald-100 border-emerald-200 text-emerald-800';
                  statusBg = 'bg-emerald-50/10';
                } else if (service.status === 'DOWN') {
                  statusColor = 'bg-rose-100 border-rose-200 text-rose-800';
                  statusBg = 'bg-rose-50/10';
                } else if (service.status === 'WARN') {
                  statusColor = 'bg-amber-100 border-amber-200 text-amber-800';
                  statusBg = 'bg-amber-50/10';
                }

                return (
                  <div
                    key={service.id}
                    id={`service-dashboard-card-${service.id}`}
                    className={`border border-slate-100 rounded-xl p-4 hover:shadow-md transition-all ${statusBg}`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            service.method === 'GET' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                            service.method === 'POST' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            'bg-teal-50 text-teal-700 border border-teal-100'
                          }`}>
                            {service.method}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800">{service.name}</h4>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {getGroupName(service.groupId)}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-400 font-mono font-english mt-1 max-w-[340px] truncate" title={service.url}>
                          {service.url}
                        </p>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusColor}`}>
                          {service.status === 'UP' ? 'در دسترس (UP)' :
                           service.status === 'DOWN' ? 'قطع سرویس (DOWN)' :
                           service.status === 'WARN' ? 'افت سرعت (WARN)' : 'نامشخص'}
                        </span>
                        
                        <button
                          id={`btn-delete-service-${service.id}`}
                          onClick={() => onDeleteService(service.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف وب‌سرویس مانیتور"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metrics grid for latency, expected vs actual field, and sparkline chart */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100/60 mt-3 text-xs text-slate-600">
                      {/* Response Time Latency */}
                      <div className="bg-white p-2 rounded-lg border border-slate-100/80 flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 block font-medium">زمان پاسخ کنونی:</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-sm font-black font-mono text-slate-800">
                            {latestHistory ? latestHistory.responseTime : '--'}
                          </span>
                          <span className="text-[9px] text-slate-400">میلی‌ثانیه</span>
                          <span className="text-[9px] text-slate-400 mr-2 font-mono">
                            (حد مجاز: {service.responseTimeThreshold}ms)
                          </span>
                        </div>
                      </div>

                      {/* Field Value Check Status */}
                      {(() => {
                        const type = service.monitorType || (service.monitorField ? 'FIELD_MATCH' : 'STATUS_ONLY');
                        const isStatistical = type === 'STATISTICAL';
                        
                        // Determine success/fail for non-statistical
                        let isSuccessful = true;
                        if (type === 'STATUS_ONLY') {
                          isSuccessful = latestHistory 
                            ? (latestHistory.statusCode === 200 || latestHistory.status === 'UP') 
                            : (service.status === 'UP');
                        } else if (type === 'FIELD_MATCH') {
                          isSuccessful = latestHistory 
                            ? String(latestHistory.fieldValue) === String(service.expectedValue)
                            : (service.status === 'UP');
                        }

                        // Determine colors
                        let containerClasses = "p-2 rounded-lg border flex flex-col justify-between transition-all ";
                        if (isStatistical) {
                          if (service.status === 'WARN') {
                            containerClasses += "bg-amber-50/30 border-amber-200 text-amber-900";
                          } else if (service.status === 'DOWN') {
                            containerClasses += "bg-rose-50/30 border-rose-200 text-rose-900";
                          } else {
                            containerClasses += "bg-emerald-50/30 border-emerald-200 text-emerald-900";
                          }
                        } else {
                          if (isSuccessful) {
                            containerClasses += "bg-emerald-50/30 border-emerald-200 text-emerald-900";
                          } else {
                            containerClasses += "bg-rose-50/30 border-rose-200 text-rose-900";
                          }
                        }

                        return (
                          <div className={containerClasses}>
                            {isStatistical ? (
                              <>
                                <span className="text-[10px] text-slate-500 block font-semibold mb-1">گزارش آماری فیلد (مقدار):</span>
                                <div className="flex flex-wrap gap-1.5 items-center justify-between">
                                  <div className="flex flex-col gap-0.5">
                                    <code className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 max-w-[120px] truncate" title={service.monitorField}>
                                      {service.monitorField}
                                    </code>
                                    {(service.minRange !== undefined || service.maxRange !== undefined) && (
                                      <span className="text-[9px] text-slate-400">
                                        رنج مجاز: {service.minRange !== undefined ? service.minRange : '∞-'} تا {service.maxRange !== undefined ? service.maxRange : '∞+'}
                                      </span>
                                    )}
                                  </div>
                                  {(() => {
                                    const val = latestHistory && latestHistory.fieldValue !== undefined ? Number(latestHistory.fieldValue) : NaN;
                                    const isOutOfRange = service.status === 'WARN' && !isNaN(val) && (
                                      (service.minRange !== undefined && val < service.minRange) ||
                                      (service.maxRange !== undefined && val > service.maxRange)
                                    );
                                    return (
                                      <span className={`text-xs font-black px-2 py-0.5 rounded font-mono ${
                                        isOutOfRange 
                                          ? 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse' 
                                          : 'text-indigo-700 bg-indigo-100/60'
                                      }`}>
                                        {latestHistory && latestHistory.fieldValue !== undefined ? String(latestHistory.fieldValue) : '---'}
                                        {isOutOfRange && ' ⚠️'}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </>
                            ) : type === 'FIELD_MATCH' ? (
                              <>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-semibold opacity-90">تطابق فیلد مانیتورینگ:</span>
                                  {isSuccessful ? (
                                    <span className="text-[9px] bg-emerald-100/80 text-emerald-800 px-1.5 py-0.5 rounded font-bold border border-emerald-200">موفق</span>
                                  ) : (
                                    <span className="text-[9px] bg-rose-100/80 text-rose-800 px-1.5 py-0.5 rounded font-bold border border-rose-200">ناموفق</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 items-center text-[10px] font-mono mt-1">
                                  <code className="text-[9px] text-indigo-800 bg-indigo-100/40 px-1 py-0.5 rounded truncate max-w-[100px]">
                                    {service.monitorField}
                                  </code>
                                  <span className="opacity-75 font-sans">برابر</span>
                                  <span className="font-bold">"{service.expectedValue}"</span>
                                  {latestHistory && !isSuccessful && (
                                    <span className="text-rose-700 font-bold font-sans">
                                      (فعلی: "{String(latestHistory.fieldValue !== undefined ? latestHistory.fieldValue : 'نبود')}")
                                    </span>
                                  )}
                                  {isSuccessful ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-auto" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-rose-600 mr-auto" />
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-semibold opacity-90">بررسی وضعیت پاسخ:</span>
                                  {isSuccessful ? (
                                    <span className="text-[9px] bg-emerald-100/80 text-emerald-800 px-1.5 py-0.5 rounded font-bold border border-emerald-200">موفق (200)</span>
                                  ) : (
                                    <span className="text-[9px] bg-rose-100/80 text-rose-800 px-1.5 py-0.5 rounded font-bold border border-rose-200">
                                      خطا ({latestHistory ? latestHistory.statusCode : '---'})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between mt-1 text-[10px]">
                                  <span className="opacity-75">صحت کد وضعیت HTTP</span>
                                  {isSuccessful ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* Sparkline Latency History Trend */}
                      <div className="bg-white p-2 rounded-lg border border-slate-100/80 flex flex-col justify-between">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                          <span>روند سرعت فراخوانی (۱۰ پایش اخیر):</span>
                          <span>بررسی هر {service.checkInterval} ثانیه</span>
                        </div>
                        
                        {/* Sparkline Visual elements */}
                        <div className="flex items-end gap-1.5 h-6 pt-1 font-english">
                          {svcHistory.map((h, hIdx) => {
                            // Calculate percentage height
                            const maxLimit = Math.max(service.responseTimeThreshold * 1.5, 500);
                            const heightPercent = Math.min((h.responseTime / maxLimit) * 100, 100);
                            
                            let barColor = 'bg-emerald-500';
                            if (h.status === 'DOWN') barColor = 'bg-rose-500';
                            else if (h.status === 'WARN') barColor = 'bg-amber-500';

                            return (
                              <div
                                key={h.id}
                                className={`w-3.5 rounded-sm ${barColor} transition-all duration-200 relative group`}
                                style={{ height: `${Math.max(heightPercent, 15)}%` }}
                              >
                                {/* Tooltip display on hover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[9px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 font-sans text-right">
                                  <p>زمان: {formatTime(h.timestamp)}</p>
                                  <p>سرعت: {h.responseTime}ms</p>
                                  <p>کد: {h.statusCode}</p>
                                  {h.errorMessage && <p className="text-rose-300 max-w-[150px] overflow-hidden text-ellipsis">{h.errorMessage}</p>}
                                </div>
                              </div>
                            );
                          })}

                          {svcHistory.length === 0 && (
                            <span className="text-[9px] text-slate-400 italic">در انتظار دریافت داده مانیتورینگ...</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-slate-400 mt-2 pt-2 border-t border-slate-100/40">
                      <span>کد ردیابی سرویس: {service.id}</span>
                      <span>آخرین مانیتور فعال: {formatTime(service.lastChecked)}</span>
                    </div>
                  </div>
                );
              })}

              {filteredServices.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  هیچ وب‌سرویسی با مشخصات فیلتر شده یافت نشد. وب‌سرویس جدیدی را در تب بالا ثبت کنید.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alerts & Logs on Right Column */}
        <div className="space-y-6">
          {/* Active Alerts Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                مرکز هشدارهای امنیتی فعال
              </h3>
              {alerts.some(a => !a.resolved) && (
                <button
                  id="btn-resolve-all-alerts"
                  onClick={onResolveAllAlerts}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  رفع تمام خطاها
                </button>
              )}
            </div>

            {/* Alerts List */}
            <div className="space-y-3 max-h-[280px] overflow-y-auto">
              {alerts.filter(a => !a.resolved).map(alert => (
                <div
                  key={alert.id}
                  id={`alert-card-${alert.id}`}
                  className="p-3 bg-rose-50 border border-rose-100 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-bold text-rose-800">{alert.serviceName}</span>
                    <button
                      id={`btn-resolve-alert-${alert.id}`}
                      onClick={() => onResolveAlert(alert.id)}
                      className="text-[9px] bg-white border border-rose-200 hover:bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold"
                    >
                      حل شد
                    </button>
                  </div>
                  
                  <p className="text-[10px] text-rose-600 leading-relaxed font-medium">
                    {alert.message}
                  </p>

                  <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-rose-100/50 pt-1.5 mt-1.5">
                    <span>گروه: {alert.groupName}</span>
                    <span>{formatDateTime(alert.timestamp)}</span>
                  </div>
                </div>
              ))}

              {alerts.filter(a => !a.resolved).length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs italic flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <span>عالی! هیچ هشدار فعالی در سیستم وجود ندارد.</span>
                </div>
              )}
            </div>
          </div>

          {/* Live Activity logs */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-4 pb-3 border-b border-slate-100">
              <Clock className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
              لاگ مانیتورینگ و جریان لحظه‌ای فعالیت‌ها
            </h3>

            {/* Logs activity timeline */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto text-[11px] leading-relaxed">
              {history.slice().reverse().slice(0, 20).map(log => {
                const service = services.find(s => s.id === log.serviceId);
                const name = service ? service.name : 'وب‌سرویس ناشناس';
                
                let dotColor = 'bg-slate-400';
                let textColor = 'text-slate-600';
                if (log.status === 'UP') {
                  dotColor = 'bg-emerald-500';
                  textColor = 'text-emerald-800';
                } else if (log.status === 'DOWN') {
                  dotColor = 'bg-rose-500';
                  textColor = 'text-rose-800';
                } else if (log.status === 'WARN') {
                  dotColor = 'bg-amber-500';
                  textColor = 'text-amber-800';
                }

                return (
                  <div key={log.id} className="flex gap-2.5 items-start p-2 hover:bg-slate-50/50 rounded-lg transition-colors border-b border-slate-100/40">
                    <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${dotColor}`} />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-bold text-slate-700">{name}</span>
                        <span>{formatTime(log.timestamp)}</span>
                      </div>
                      
                      <p className={`${textColor} text-[10px] font-medium`}>
                        {log.status === 'UP' ? 'فراخوانی موفقیت‌آمیز بود.' : log.errorMessage}
                      </p>

                      <div className="flex gap-4 text-[9px] text-slate-400 font-mono">
                        <span>کد: {log.statusCode || 'N/A'}</span>
                        <span>زمان پاسخ: {log.responseTime}ms</span>
                        {log.fieldValue !== undefined && (
                          <span className="max-w-[120px] truncate" title={String(log.fieldValue)}>
                            دیتا: {String(log.fieldValue)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {history.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-8 italic">
                  در انتظار دریافت لاگ‌های مانیتورینگ خودکار...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
