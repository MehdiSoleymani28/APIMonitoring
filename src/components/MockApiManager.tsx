import React, { useState } from 'react';
import { MockEndpoint } from '../types.js';
import { Play, Settings, RefreshCw, AlertTriangle, CheckCircle2, Server, Save, Code, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface MockApiManagerProps {
  mockEndpoints: MockEndpoint[];
  onUpdateMock: (id: string, updateData: Partial<MockEndpoint>) => Promise<void>;
  onAddMock: (path: string, status: number, delay: number, body: string) => Promise<void>;
}

export default function MockApiManager({ mockEndpoints, onUpdateMock, onAddMock }: MockApiManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Edit states
  const [status, setStatus] = useState(200);
  const [delay, setDelay] = useState(0);
  const [bodyText, setBodyText] = useState('');
  
  // Add new states
  const [newPath, setNewPath] = useState('');
  const [newStatus, setNewStatus] = useState(200);
  const [newDelay, setNewDelay] = useState(0);
  const [newBodyText, setNewBodyText] = useState('{\n  "status": "healthy",\n  "active": true\n}');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleStartEdit = (mock: MockEndpoint) => {
    setEditingId(mock.id);
    setStatus(mock.status);
    setDelay(mock.responseTimeDelay);
    setBodyText(mock.responseBody);
  };

  const handleSaveEdit = async (id: string) => {
    setIsSubmitting(true);
    try {
      // Basic JSON validation before save
      try {
        JSON.parse(bodyText);
      } catch (err) {
        alert('فرمت کد پاسخ JSON وارد شده نامعتبر است. لطفاً ساختار JSON را اصلاح کنید.');
        setIsSubmitting(false);
        return;
      }

      await onUpdateMock(id, {
        status,
        responseTimeDelay: delay,
        responseBody: bodyText
      });
      setEditingId(null);
      triggerSuccess('تنظیمات شبیه‌ساز با موفقیت آپدیت شد. در پایش بعدی اثر داده خواهد شد.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath.trim()) return;

    try {
      JSON.parse(newBodyText);
    } catch (err) {
      alert('فرمت کد پاسخ JSON نامعتبر است.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddMock(newPath, newStatus, newDelay, newBodyText);
      setNewPath('');
      setNewStatus(200);
      setNewDelay(0);
      setNewBodyText('{\n  "status": "healthy",\n  "active": true\n}');
      setShowAddForm(false);
      triggerSuccess('مسیر شبیه‌ساز جدید با موفقیت ایجاد شد.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Preset fast configurations for tests
  const handleQuickFailure = async (mock: MockEndpoint) => {
    await onUpdateMock(mock.id, {
      status: 500,
      responseTimeDelay: 50,
      responseBody: JSON.stringify({ error: "Internal Server Error", system_status: "failed" }, null, 2)
    });
    triggerSuccess(`شبیه‌سازی خطا (500) روی مسیر /api/mock/${mock.path} اعمال شد.`);
  };

  const handleQuickLatency = async (mock: MockEndpoint) => {
    await onUpdateMock(mock.id, {
      status: 200,
      responseTimeDelay: 1200, // triggers latency threshold
      responseBody: mock.responseBody
    });
    triggerSuccess(`شبیه‌سازی افت سرعت (1200ms) روی مسیر /api/mock/${mock.path} اعمال شد.`);
  };

  const handleQuickHealthy = async (mock: MockEndpoint) => {
    // Restore default ok states
    let restoredBody = mock.responseBody;
    try {
      const parsed = JSON.parse(mock.responseBody);
      if (parsed.error) {
        restoredBody = JSON.stringify({
          status: "active",
          vault_status: "operational",
          db_connection: "connected"
        }, null, 2);
      }
    } catch (e) {}

    await onUpdateMock(mock.id, {
      status: 200,
      responseTimeDelay: 60,
      responseBody: restoredBody
    });
    triggerSuccess(`مسیر /api/mock/${mock.path} به وضعیت نرمال (200 OK) بازگشت.`);
  };

  return (
    <div id="mock-api-manager-panel" className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            شبیه‌ساز هوشمند وب‌سرویس‌ها (Mock endpoints)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            برای مانیتورینگ بدون دردسر، در این بخش چند روت شبیه‌ساز واقعی ایجاد کرده‌ایم. می‌توانید با یک کلیک روی آنها خطا یا افت سرعت شبیه‌سازی کرده و واکنش فوری داشبورد مانیتورینگ را ببینید!
          </p>
        </div>

        <button
          id="btn-toggle-add-mock"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
        >
          ایجاد روت شبیه‌ساز جدید
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add Mock Route Form */}
      {showAddForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleCreateMock}
          className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4"
        >
          <h3 className="text-xs font-bold text-slate-700">افزودن وب‌سرویس شبیه‌ساز جدید</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">مسیر روت (Path)</label>
              <div className="flex items-center gap-1 font-english">
                <span className="text-xs text-slate-400">/api/mock/</span>
                <input
                  id="input-mock-path"
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="v1/test-api"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">کد وضعیت پاسخ HTTP</label>
              <input
                id="input-mock-status"
                type="number"
                value={newStatus}
                onChange={(e) => setNewStatus(Number(e.target.value))}
                placeholder="200"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-english"
                min={100}
                max={599}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">میزان تاخیر پاسخ (میلی‌ثانیه)</label>
              <input
                id="input-mock-delay"
                type="number"
                value={newDelay}
                onChange={(e) => setNewDelay(Number(e.target.value))}
                placeholder="0"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-english"
                min={0}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">کد JSON خروجی</label>
            <textarea
              id="textarea-mock-body"
              value={newBodyText}
              onChange={(e) => setNewBodyText(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg font-mono bg-white font-english"
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold disabled:opacity-50"
            >
              ایجاد روت شبیه‌ساز
            </button>
          </div>
        </motion.form>
      )}

      {/* Mock Routes list */}
      <div className="space-y-6">
        {mockEndpoints.map((mock) => {
          const isEditing = editingId === mock.id;
          
          let healthBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
          if (mock.status >= 400) {
            healthBadge = 'bg-rose-50 text-rose-700 border border-rose-100';
          } else if (mock.responseTimeDelay > 500) {
            healthBadge = 'bg-amber-50 text-amber-700 border border-amber-100';
          }

          return (
            <div
              key={mock.id}
              id={`mock-endpoint-card-${mock.id}`}
              className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="font-english">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100">
                      MOCK ENDPOINT
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${healthBadge}`}>
                      HTTP {mock.status} ({mock.responseTimeDelay}ms تاخیر)
                    </span>
                  </div>

                  <p className="text-xs font-mono font-bold text-slate-700 mt-2 text-left">
                    http://localhost:3000/api/mock/{mock.path}
                  </p>
                </div>

                {/* Simulation controls */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <button
                    id={`btn-mock-healthy-${mock.id}`}
                    onClick={() => handleQuickHealthy(mock)}
                    className="px-2.5 py-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-semibold"
                  >
                    شبیه‌سازی سالم
                  </button>
                  <button
                    id={`btn-mock-latency-${mock.id}`}
                    onClick={() => handleQuickLatency(mock)}
                    className="px-2.5 py-1 text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-semibold"
                  >
                    شبیه‌سازی کندی سرعت
                  </button>
                  <button
                    id={`btn-mock-fail-${mock.id}`}
                    onClick={() => handleQuickFailure(mock)}
                    className="px-2.5 py-1 text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded font-semibold"
                  >
                    شبیه‌سازی قطعی و خطا
                  </button>
                </div>
              </div>

              {/* Editing block or JSON preview */}
              <div className="bg-white border border-slate-100 rounded-lg p-3">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 font-semibold">کد وضعیت خروجی</label>
                        <input
                          type="number"
                          value={status}
                          onChange={(e) => setStatus(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-slate-50 font-english"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 font-semibold">میزان تاخیر (ms)</label>
                        <input
                          type="number"
                          value={delay}
                          onChange={(e) => setDelay(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-slate-50 font-english"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-semibold">کد خروجی (JSON)</label>
                      <textarea
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        className="w-full p-2 text-xs border border-slate-200 rounded font-mono bg-slate-50 font-english"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 text-[10px] text-slate-500 hover:bg-slate-100 rounded"
                      >
                        انصراف
                      </button>
                      <button
                        onClick={() => handleSaveEdit(mock.id)}
                        disabled={isSubmitting}
                        className="px-3.5 py-1 text-[10px] text-white bg-indigo-600 hover:bg-indigo-700 rounded font-bold flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        ذخیره تنظیمات
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Code className="w-3 h-3 text-slate-400" />
                        بدنه پاسخ شبیه‌ساز (JSON payload):
                      </span>
                      <button
                        id={`btn-edit-mock-${mock.id}`}
                        onClick={() => handleStartEdit(mock)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold"
                      >
                        ویرایش دستی بدنه JSON
                      </button>
                    </div>
                    <pre className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded h-[90px] overflow-y-auto text-left font-english">
                      {mock.responseBody}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
