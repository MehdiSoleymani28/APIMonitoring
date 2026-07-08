import React, { useState, useEffect } from 'react';
import { Group, Service } from '../types.js';
import { Play, Plus, Trash2, HelpCircle, Code, ShieldAlert, CheckCircle, Clock, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface ServiceCreatorProps {
  groups: Group[];
  onAddService: (serviceData: any) => Promise<void>;
  mockEndpoints: any[];
}

export default function ServiceCreator({ groups, onAddService, mockEndpoints }: ServiceCreatorProps) {
  // Service definition states
  const [groupId, setGroupId] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [body, setBody] = useState('');
  
  // Monitoring criteria states
  const [monitorField, setMonitorField] = useState('');
  const [expectedValue, setExpectedValue] = useState('');
  const [minRange, setMinRange] = useState('');
  const [maxRange, setMaxRange] = useState('');
  const [checkInterval, setCheckInterval] = useState(10); // in seconds
  const [responseTimeThreshold, setResponseTimeThreshold] = useState(300); // in ms
  const [monitorType, setMonitorType] = useState<'STATUS_ONLY' | 'FIELD_MATCH' | 'STATISTICAL'>('STATUS_ONLY');

  // Sync monitorType automatically based on monitorField presence
  useEffect(() => {
    if (!monitorField) {
      setMonitorType('STATUS_ONLY');
    } else if (monitorType === 'STATUS_ONLY') {
      setMonitorType('FIELD_MATCH');
    }
  }, [monitorField]);

  // Test call states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    statusCode: number;
    responseTime: number;
    body: any;
    error?: string;
  } | null>(null);
  
  const [extractedPaths, setExtractedPaths] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Set default groupId if available
  useEffect(() => {
    if (groups.length > 0 && !groupId) {
      setGroupId(groups[0].id);
    }
  }, [groups, groupId]);

  // Recursively extract all dotted-paths from a JSON object
  const extractPaths = (obj: any, prefix = ''): string[] => {
    if (obj === null || obj === undefined) return [];
    if (typeof obj !== 'object') return [prefix];
    
    let paths: string[] = [];
    for (const key of Object.keys(obj)) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (Array.isArray(obj[key])) {
          paths.push(newPrefix);
          if (obj[key].length > 0) {
            paths = paths.concat(extractPaths(obj[key][0], `${newPrefix}[0]`));
          }
        } else {
          paths = paths.concat(extractPaths(obj[key], newPrefix));
        }
      } else {
        paths.push(newPrefix);
      }
    }
    return paths;
  };

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleHeaderChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...headers];
    updated[index][field] = val;
    setHeaders(updated);
  };

  // Run proxy test call to server
  const handleTestCall = async () => {
    if (!url) return;
    setIsTesting(true);
    setTestResult(null);
    setExtractedPaths([]);

    try {
      const response = await fetch('/api/test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method,
          headers,
          body,
          groupId
        })
      });
      const data = await response.json();
      setTestResult(data);
      
      if (data.success && data.body) {
        // Automatically extract fields path from mock call
        const paths = extractPaths(data.body);
        setExtractedPaths(paths);
        if (paths.length > 0) {
          setSelectedPath(paths[0]);
          setMonitorField(paths[0]);
        }
      }
    } catch (err) {
      console.error(err);
      setTestResult({
        success: false,
        statusCode: 0,
        responseTime: 0,
        body: null,
        error: 'امکان برقراری ارتباط با سرور برای تست فراهم نشد'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSelectPath = (path: string) => {
    setSelectedPath(path);
    setMonitorField(path);
    
    // Automatically suggest expected value from test output if available
    if (testResult && testResult.success && testResult.body) {
      // Clean path and split
      const parts = path.replace(/\[(\w+)\]/g, '.$1').split('.');
      let val = testResult.body;
      for (const part of parts) {
        if (val) val = val[part];
      }
      if (val !== undefined && val !== null) {
        setExpectedValue(String(val));
      }
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !name || !url) return;

    setIsSubmitting(true);
    try {
      await onAddService({
        groupId,
        name,
        url,
        method,
        headers,
        body,
        monitorField,
        expectedValue,
        checkInterval,
        responseTimeThreshold,
        monitorType,
        minRange: minRange !== '' ? Number(minRange) : undefined,
        maxRange: maxRange !== '' ? Number(maxRange) : undefined
      });

      // Clear states
      setName('');
      setUrl('');
      setMethod('GET');
      setHeaders([]);
      setBody('');
      setMonitorField('');
      setExpectedValue('');
      setMinRange('');
      setMaxRange('');
      setMonitorType('STATUS_ONLY');
      setTestResult(null);
      setExtractedPaths([]);
      
      setSuccessMsg('وب‌سرویس جدید با موفقیت ثبت و فرآیند مانیتورینگ خودکار آن آغاز شد.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectMockUrl = (mockPath: string) => {
    setUrl(`http://localhost:3000/api/mock/${mockPath}`);
  };

  return (
    <div id="service-creator-panel" className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Code className="w-5 h-5 text-indigo-600" />
          تعریف وب‌سرویس و مانیتورینگ هوشمند پاسخ
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          در این بخش جزئیات وب‌سرویس خود را ثبت کرده، آن را فراخوانی کنید و مشخص کنید مایلید وضعیت کدام یک از کلیدهای پاسخ مانیتور شود.
        </p>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-pulse">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
          ابتدا باید حداقل یک گروه کاری در بخش مدیریت گروه‌ها ایجاد کنید.
        </div>
      ) : (
        <form onSubmit={handleCreateService} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Associated Group */}
            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">گروه وب‌سرویس</label>
              <select
                id="select-service-group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                required
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Name */}
            <div className="md:col-span-2">
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">نام وب‌سرویس</label>
              <input
                id="input-service-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: بررسی سرویس سلامت تراکنش‌های ارزی"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* URL & Method */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-[11px] text-slate-500 font-semibold">آدرس اینترنتی وب‌سرویس (URL)</label>
              {mockEndpoints.length > 0 && (
                <div className="flex gap-1.5 items-center">
                  <span className="text-[10px] text-indigo-500 font-medium">روت‌های شبیه‌ساز فعال:</span>
                  {mockEndpoints.map((mock) => (
                    <button
                      key={mock.id}
                      type="button"
                      onClick={() => handleSelectMockUrl(mock.path)}
                      className="text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-mono"
                    >
                      /{mock.path}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 font-english">
              <select
                id="select-service-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 text-slate-800 font-bold"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
              <input
                id="input-service-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.domain.com/v1/health?date={{today_jalali}}"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                required
              />
            </div>

            {/* Dynamic parameters guide banner */}
            <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-3 text-[11px] text-slate-600 space-y-1.5">
              <span className="font-black block text-amber-700 text-xs">💡 امکان تعریف پارامترهای پویا (داینامیک) تاریخ و زمان</span>
              <p className="leading-relaxed text-slate-500">
                شما می‌توانید از تگ‌های زیر در <span className="font-bold">آدرس وب‌سرویس (URL)</span>، <span className="font-bold">مقدار هدرها</span> یا <span className="font-bold">بدنه ریکوئست (Body)</span> استفاده کنید تا در زمان ارسال به‌صورت خودکار با مقدار جاری سیستم جایگزین شوند:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-[10px] text-slate-700">
                <div className="bg-white px-2 py-1 rounded border border-amber-100/70 flex justify-between items-center">
                  <span>تاریخ شمسی روز: <span className="text-amber-800 font-bold">۱۴۰۵-۰۴-۱۷</span></span>
                  <code className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black">{"{{today_jalali}}"}</code>
                </div>
                <div className="bg-white px-2 py-1 rounded border border-amber-100/70 flex justify-between items-center">
                  <span>تاریخ میلادی روز: <span className="text-amber-800 font-bold">2026-07-08</span></span>
                  <code className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black">{"{{today}}"}</code>
                </div>
                <div className="bg-white px-2 py-1 rounded border border-amber-100/70 flex justify-between items-center">
                  <span>برچسب‌زمان (میلی‌ثانیه):</span>
                  <code className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black">{"{{timestamp}}"}</code>
                </div>
                <div className="bg-white px-2 py-1 rounded border border-amber-100/70 flex justify-between items-center">
                  <span>برچسب‌زمان (ثانیه):</span>
                  <code className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black">{"{{timestamp_seconds}}"}</code>
                </div>
                <div className="bg-white px-2 py-1 rounded border border-amber-100/70 flex justify-between items-center">
                  <span>اجزای شمسی: <span className="text-slate-400">{"{{jalali_year}}"} ، {"{{jalali_month}}"} ، {"{{jalali_day}}"}</span></span>
                  <span className="text-[9px] bg-amber-50 text-amber-800 px-1 rounded">مثال: ۱۴۰۵</span>
                </div>
                <div className="bg-white px-2 py-1 rounded border border-amber-100/70 flex justify-between items-center">
                  <span>اجزای میلادی: <span className="text-slate-400">{"{{year}}"} ، {"{{month}}"} ، {"{{day}}"}</span></span>
                  <span className="text-[9px] bg-amber-50 text-amber-800 px-1 rounded">مثال: 2026</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Headers Setup */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                تنظیم هدرهای وب‌سرویس (Headers)
              </span>
              <button
                id="btn-add-header"
                type="button"
                onClick={handleAddHeader}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                افزودن هدر
              </button>
            </div>

            {headers.length > 0 ? (
              <div className="space-y-2 font-english">
                {headers.map((header, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      id={`header-key-${index}`}
                      type="text"
                      placeholder="Authorization"
                      value={header.key}
                      onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                      className="w-1/2 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      id={`header-value-${index}`}
                      type="text"
                      placeholder="Bearer {TOKEN}"
                      value={header.value}
                      onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                      className="w-1/2 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                    <button
                      id={`btn-remove-header-${index}`}
                      type="button"
                      onClick={() => handleRemoveHeader(index)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 text-center py-2">
                هدری ثبت نشده است. (در صورت نیاز به توکن فعال از هدر با مقدار <code className="bg-slate-100 px-1 rounded text-indigo-700 font-mono text-[9px]">{'Bearer {TOKEN}'}</code> استفاده کنید)
              </p>
            )}
          </div>

          {/* Request Body Area (if method is POST or PUT) */}
          {method !== 'GET' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1"
            >
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">بدنه درخواست (Request Body - JSON)</label>
              <textarea
                id="textarea-service-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{ "userId": 123, "active": true }'
                className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono bg-slate-50/50"
                rows={4}
              />
            </motion.div>
          )}

          {/* Run Initial Test and Path Selection */}
          <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800">تست اولیه وب‌سرویس و مانیتورینگ هوشمند پاسخ</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  توصیه می‌شود قبل از ذخیره، یک بار وب‌سرویس را فرخوانی کنید تا سیستم کلیدهای موجود در پاسخ را بررسی کند.
                </p>
              </div>
              <button
                id="btn-test-service-call"
                type="button"
                onClick={handleTestCall}
                disabled={isTesting || !url}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isTesting ? 'در حال فراخوانی...' : 'تست وب‌سرویس و بررسی پاسخ'}
              </button>
            </div>

            {/* Test Results and JSON selector */}
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-indigo-100 pt-4"
              >
                {/* Result indicators */}
                <div className="space-y-3">
                  <h5 className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <CheckCircle className={`w-4 h-4 ${testResult.success ? 'text-emerald-500' : 'text-rose-500'}`} />
                    مشخصات پاسخ دریافتی
                  </h5>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400">کد وضعیت پاسخ:</span>
                      <p className={`font-mono font-bold mt-0.5 ${testResult.statusCode >= 200 && testResult.statusCode < 300 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {testResult.statusCode || 'ناموفق'}
                      </p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400">زمان کل پاسخ:</span>
                      <p className="font-mono font-bold text-slate-700 mt-0.5">
                        {testResult.responseTime} ms
                      </p>
                    </div>
                  </div>

                  {testResult.success && extractedPaths.length > 0 ? (
                    <div className="space-y-2">
                      <label className="block text-[11px] text-slate-600 font-semibold">
                        انتخاب فیلد مورد مانیتور (از پاسخ دریافت شده):
                      </label>
                      <select
                        id="select-extracted-path"
                        value={selectedPath}
                        onChange={(e) => handleSelectPath(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        {extractedPaths.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        با انتخاب هر فیلد، سیستم مقدار کنونی آن را از پاسخ استخراج کرده و به عنوان مقدار مورد انتظار شما پیشنهاد می‌دهد.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-100">
                      {testResult.error || 'پاسخ دریافتی نامعتبر بود یا ساختار JSON نداشت. مانیتورینگ برای این وب‌سرویس بر اساس صحت کانکشن و کد وضعیت انجام خواهد شد.'}
                    </div>
                  )}
                </div>

                {/* Raw Body output */}
                <div className="space-y-1.5 font-english">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-slate-500 font-sans flex items-center gap-1">
                      <Code className="w-3 h-3 text-slate-400" />
                      Response Data
                    </span>
                  </div>
                  <pre className="p-2.5 bg-slate-900 font-mono text-[10px] rounded-lg h-[150px] overflow-y-auto overflow-x-auto text-left whitespace-pre-wrap break-all">
                    {testResult.error ? (
                      <span className="text-rose-400 font-medium">
                        {`[ERROR] ${testResult.error}`}
                      </span>
                    ) : (
                      <span className="text-emerald-400">
                        {JSON.stringify(testResult.body, null, 2)}
                      </span>
                    )}
                  </pre>
                </div>
              </motion.div>
            )}
          </div>

          {/* Warning / Threshold criteria config */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              تنظیمات مانیتورینگ و فواصل زمانی چک کردن وضعیت
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs">
              {/* Field Path Key */}
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-semibold">فیلد مانیتورینگ (JSON Path)</label>
                <input
                  id="input-monitor-field"
                  type="text"
                  value={monitorField}
                  onChange={(e) => setMonitorField(e.target.value)}
                  placeholder="مثال: status"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-english text-xs bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Monitoring Type */}
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-semibold">نوع مانیتورینگ</label>
                <select
                  id="select-monitor-type"
                  value={monitorType}
                  onChange={(e) => setMonitorType(e.target.value as any)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white font-medium text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none ${
                    monitorField ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-200'
                  }`}
                >
                  <option value="STATUS_ONLY">کد وضعیت پاسخ (200 OK)</option>
                  {monitorField && (
                    <>
                      <option value="FIELD_MATCH">بررسی پاسخ (تطابق فیلد)</option>
                      <option value="STATISTICAL">آمار و گزارش عددی فیلد</option>
                    </>
                  )}
                </select>
              </div>

              {/* Expected Value or Range Boundaries */}
              {monitorType === 'STATISTICAL' ? (
                <>
                  <div>
                    <label className="block text-[11px] mb-1 font-semibold text-amber-600">
                      حداقل مقدار مجاز (رنج)
                    </label>
                    <input
                      id="input-min-range"
                      type="number"
                      step="any"
                      value={minRange}
                      onChange={(e) => setMinRange(e.target.value)}
                      placeholder="بدون محدودیت حداقل"
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs bg-amber-50/10 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1 font-semibold text-amber-600">
                      حداکثر مقدار مجاز (رنج)
                    </label>
                    <input
                      id="input-max-range"
                      type="number"
                      step="any"
                      value={maxRange}
                      onChange={(e) => setMaxRange(e.target.value)}
                      placeholder="بدون محدودیت حداکثر"
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs bg-amber-50/10 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className={`block text-[11px] mb-1 font-semibold ${
                    monitorType === 'FIELD_MATCH' ? 'text-slate-500' : 'text-slate-300'
                  }`}>
                    مقدار مورد انتظار فیلد
                  </label>
                  <input
                    id="input-expected-value"
                    type="text"
                    value={expectedValue}
                    onChange={(e) => setExpectedValue(e.target.value)}
                    disabled={monitorType !== 'FIELD_MATCH'}
                    placeholder={
                      monitorType === 'STATUS_ONLY' ? 'عدم نیاز به فیلد' :
                      'مثال: active یا true'
                    }
                    className={`w-full px-3 py-2 border rounded-lg text-xs transition-all ${
                      monitorType === 'FIELD_MATCH' 
                        ? 'border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none' 
                        : 'border-slate-100 bg-slate-50 text-slate-400'
                    }`}
                  />
                </div>
              )}

              {/* Interval check */}
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  بازه زمانی بررسی وضعیت
                </label>
                <select
                  id="select-check-interval"
                  value={checkInterval}
                  onChange={(e) => setCheckInterval(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={5}>هر ۵ ثانیه (سریع)</option>
                  <option value={10}>هر ۱۰ ثانیه</option>
                  <option value={30}>هر ۳۰ ثانیه</option>
                  <option value={60}>هر ۱ دقیقه</option>
                  <option value={300}>هر ۵ دقیقه</option>
                  <option value={600}>هر ۱۰ دقیقه</option>
                </select>
              </div>

              {/* Time Threshold */}
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-semibold">حداکثر زمان پاسخ مجاز (ms)</label>
                <input
                  id="input-response-threshold"
                  type="number"
                  value={responseTimeThreshold}
                  onChange={(e) => setResponseTimeThreshold(Number(e.target.value))}
                  placeholder="300"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-english text-xs bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  min={20}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              id="btn-submit-service"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'در حال ثبت و فعال‌سازی مانیتور...' : 'ثبت نهایی وب‌سرویس مانیتورینگ'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
