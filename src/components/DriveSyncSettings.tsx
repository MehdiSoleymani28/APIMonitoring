import React, { useState, useEffect } from 'react';
import { googleSignIn, logout, auth } from '../firebase.js';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  Cloud, 
  CloudUpload, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  FileText, 
  AlertCircle, 
  ArrowLeftRight, 
  Clock, 
  User as UserIcon,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SyncHistoryItem {
  id: string;
  timestamp: string;
  success: boolean;
  message: string;
  filename: string;
}

interface DriveStatus {
  enabled: boolean;
  lastSyncTime: string | null;
  lastSyncStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | 'NOT_CONFIGURED';
  lastSyncMessage: string;
  hasToken: boolean;
  history: SyncHistoryItem[];
}

export default function DriveSyncSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Monitor Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      fetchStatus();
    });
    return unsubscribe;
  }, []);

  // Fetch drive configuration and history from backend
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/drive/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Error fetching drive status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Connect Google account and retrieve access token
  const handleConnect = async () => {
    try {
      setErrorMsg(null);
      setSyncing(true);
      const result = await googleSignIn();
      if (result) {
        // Send configuration to server
        const response = await fetch('/api/drive/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: result.accessToken,
            enabled: status ? status.enabled : true // enable by default on connect
          })
        });
        if (response.ok) {
          const updated = await response.json();
          setStatus(updated.config ? { ...updated.config, history: updated.history } : null);
          await fetchStatus();
        }
      }
    } catch (error: any) {
      console.error('Google Auth Failed:', error);
      setErrorMsg(error.message || 'خطا در برقراری ارتباط با حساب کاربری گوگل');
    } finally {
      setSyncing(false);
    }
  };

  // Disconnect Google account and clear token on backend
  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await logout();
      const response = await fetch('/api/drive/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: '',
          enabled: false
        })
      });
      if (response.ok) {
        await fetchStatus();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle hourly auto sync
  const handleToggleSync = async () => {
    if (!status) return;
    try {
      const targetEnabled = !status.enabled;
      const response = await fetch('/api/drive/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: targetEnabled
        })
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(prev => prev ? { 
          ...prev, 
          enabled: data.config.enabled,
          lastSyncTime: data.config.lastSyncTime,
          lastSyncStatus: data.config.lastSyncStatus,
          lastSyncMessage: data.config.lastSyncMessage,
          history: data.history 
        } : null);
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  // Manually trigger a backup right now
  const handleSyncNow = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      setErrorMsg(null);
      const res = await fetch('/api/drive/sync-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const result = await res.json();
        if (!result.success) {
          setErrorMsg(result.message);
        }
        await fetchStatus();
      }
    } catch (err) {
      console.error('Manual sync failed:', err);
      setErrorMsg('خطا در ارتباط با سرور هنگام همگام‌سازی لاگ‌ها');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (syncStatus: string) => {
    switch (syncStatus) {
      case 'SUCCESS':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            فعال و موفق
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
            <XCircle className="w-3.5 h-3.5" />
            خطا در همگام‌سازی
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <AlertCircle className="w-3.5 h-3.5" />
            تنظیم نشده
          </span>
        );
    }
  };

  return (
    <div id="drive-sync-panel" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm/50 transition-all">
      {/* Header section with brand info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl dark:bg-amber-500/20">
            <Cloud className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">پشتیبان‌گیری هوشمند در گوگل درایو (Google Drive Log Backups)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ذخیره خودکار تمام لاگ‌های بررسی وب‌سرویس‌ها به صورت فایل متنی متوالی هر ۱ ساعت</p>
          </div>
        </div>

        {/* User profile / Connection control */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">{user.displayName || 'کاربر گوگل'}</p>
                <p className="text-[9px] text-slate-400 font-mono">{user.email}</p>
              </div>
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-white dark:border-slate-700 shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded-xl border border-rose-100 dark:border-rose-900/40 transition-all cursor-pointer"
              >
                قطع اتصال
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={syncing}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-lg shadow-amber-100 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <CloudUpload className="w-4 h-4" />
              اتصال به گوگل درایو
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl flex items-start gap-3 text-xs text-rose-700 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-black">خطا در عملیات گوگل درایو</p>
            <p className="mt-1 leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Main settings panel */}
      {status && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Quick Controls Card */}
          <div className="lg:col-span-5 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 flex flex-col justify-between gap-6">
            
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300">تنظیمات و فرمان‌ها</h3>
              
              {/* Toggle auto sync */}
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm/50">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">پشتیبان‌گیری خودکار ساعتی</p>
                  <p className="text-[10px] text-slate-400 mt-1">تولید و آپلود فایل متنی لاگ‌ها در هر ساعت</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSync}
                  disabled={!status.hasToken}
                  className={`cursor-pointer transition-all ${!status.hasToken ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                >
                  {status.enabled ? (
                    <ToggleRight className="w-10 h-10 text-amber-500 fill-amber-100 dark:fill-none" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  )}
                </button>
              </div>

              {/* Manual Backup Trigger */}
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">تهیه نسخه پشتیبان دستی</p>
                  <p className="text-[10px] text-slate-400 mt-1">آپلود سریع لاگ‌ها به درایو در همین لحظه</p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={!status.hasToken || syncing}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-amber-500 hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 dark:hover:bg-amber-600 font-bold text-xs px-4 py-2 rounded-xl border border-slate-200/50 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  پشتیبان‌گیری آنی
                </button>
              </div>
            </div>

            {/* Sync Metadata Dashboard */}
            <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">آخرین وضعیت همگام‌سازی</span>
                {getStatusBadge(status.lastSyncStatus)}
              </div>
              
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  آخرین زمان همگام‌سازی
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                  {status.lastSyncTime 
                    ? new Date(status.lastSyncTime).toLocaleString('fa-IR') 
                    : 'تاکنون همگام‌سازی انجام نشده'}
                </span>
              </div>

              {status.lastSyncMessage && (
                <div className="p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed border border-slate-200/50 dark:border-slate-800">
                  {status.lastSyncMessage}
                </div>
              )}
            </div>

          </div>

          {/* Backup logs history list */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              تاریخچه آخرین نسخه‌های پشتیبان متنی (Backup Logs)
            </h3>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm/50">
              {status.history && status.history.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-bold">
                        <th className="p-3.5">نام فایل ذخیره شده</th>
                        <th className="p-3.5 text-center">زمان</th>
                        <th className="p-3.5 text-center">وضعیت آپلود</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {status.history.map((item) => (
                        <tr key={item.id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                          <td className="p-3.5 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[200px]" title={item.filename}>
                                {item.filename}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-center font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {new Date(item.timestamp).toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3.5 text-center">
                            {item.success ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md font-bold">
                                <ShieldCheck className="w-3 h-3" />
                                با موفقیت
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-md font-bold" title={item.message}>
                                <XCircle className="w-3 h-3" />
                                شکست خورد
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                  <ArrowLeftRight className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 animate-bounce mb-3" />
                  <p className="text-xs font-bold">تاکنون نسخه‌ پشتیبانی آپلود نشده است.</p>
                  <p className="text-[10px] mt-1 text-slate-400">با کلیک روی دکمه پشتیبان‌گیری آنی می‌توانید اولین لاگ سیستم را ارسال کنید.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* When not connected, show instructions card */}
      {!status && !loading && (
        <div className="mt-6 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 text-center max-w-xl mx-auto">
          <Cloud className="w-10 h-10 text-amber-500/80 mx-auto animate-pulse mb-3" />
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">اتصال حساب گوگل جهت همگام‌سازی</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
            برای ذخیره‌سازی لاگ‌های سیستم روی فضای ابری گوگل درایو شخصی خود به صورت خودکار، نیاز است تا برنامه پایشگر وب‌سرویس‌ها را به حساب گوگل خود متصل کنید. پس از اتصال، لاگ‌های فشرده‌شده هر یک ساعت به صورت فایل متنی سازماندهی شده بکاپ گرفته می‌شوند.
          </p>
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={handleConnect}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-6 py-2.5 rounded-2xl shadow-lg shadow-amber-100 dark:shadow-none hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <CloudUpload className="w-4 h-4 animate-bounce" />
              ورود با حساب گوگل و فعال‌سازی
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
