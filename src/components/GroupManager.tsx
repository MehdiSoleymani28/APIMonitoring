import React, { useState } from 'react';
import { Group } from '../types.js';
import { Plus, Key, ShieldCheck, RefreshCw, Calendar, Check, AlertCircle, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface GroupManagerProps {
  groups: Group[];
  onAddGroup: (name: string, token: string) => Promise<void>;
  onUpdateToken: (groupId: string, token: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
}

export default function GroupManager({ groups, onAddGroup, onUpdateToken, onDeleteGroup }: GroupManagerProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupToken, setNewGroupToken] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [tempToken, setTempToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddGroup(newGroupName, newGroupToken);
      setNewGroupName('');
      setNewGroupToken('');
      setShowAddForm(false);
      triggerSuccess('گروه جدید با موفقیت ایجاد شد.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditToken = (group: Group) => {
    setEditingGroupId(group.id);
    setTempToken(group.token);
  };

  const handleSaveToken = async (groupId: string) => {
    setIsSubmitting(true);
    try {
      await onUpdateToken(groupId, tempToken);
      setEditingGroupId(null);
      triggerSuccess('توکن احراز هویت روزانه با موفقیت بروزرسانی شد.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    setIsSubmitting(true);
    try {
      await onDeleteGroup(groupId);
      setConfirmDeleteGroupId(null);
      triggerSuccess('گروه و تمامی وب‌سرویس‌های آن با موفقیت حذف شدند.');
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

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  };

  // Check if a token is older than 24 hours (simulating daily token requirement warning)
  const isTokenOutdated = (updatedAtStr: string) => {
    const updated = new Date(updatedAtStr).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return now - updated > twentyFourHours;
  };

  return (
    <div id="group-manager-panel" className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            تعریف گروه‌ها و مدیریت توکن‌های روزانه
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            وب‌سرویس‌های خود را در گروه‌های مجزا دسته‌بندی کرده و توکن‌های احراز هویت را به صورت روزانه بروزرسانی کنید.
          </p>
        </div>
        
        <button
          id="btn-toggle-add-group"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          ایجاد گروه جدید
        </button>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center gap-2"
        >
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {/* Add Group Form */}
      {showAddForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleCreateGroup}
          className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4"
        >
          <h3 className="text-xs font-bold text-slate-700">افزودن گروه کاری جدید</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">نام گروه (مثال: وب‌سرویس‌های مالی)</label>
              <input
                id="input-group-name"
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="مثلا: وب‌سرویس‌های بخش کاربری"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">توکن احراز هویت اولیه (اختیاری)</label>
              <input
                id="input-group-token"
                type="text"
                value={newGroupToken}
                onChange={(e) => setNewGroupToken(e.target.value)}
                placeholder="Bearer eyJhbGciOi..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white font-mono"
              />
            </div>
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
              className="px-4 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold disabled:opacity-50"
            >
              {isSubmitting ? 'در حال ثبت...' : 'ثبت گروه جدید'}
            </button>
          </div>
        </motion.form>
      )}

      {/* Warning Alert about Daily Token Requirement */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed">
          <p className="font-bold mb-1">الزام احراز هویت روزانه وب‌سرویس‌ها:</p>
          <p>
            سرویس‌های تعریف شده در هر گروه برای فراخوانی موفق به توکن احراز هویت گروه خود وابسته هستند. در صورتی که هدر وب‌سرویس شامل عبارت <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono text-[10px]">{'{TOKEN}'}</code> باشد، سیستم به طور خودکار توکن روزانه فعال گروه را جایگزین خواهد کرد. لطفاً توکن‌ها را هر ۲۴ ساعت تمدید کنید.
          </p>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => {
          const outdated = isTokenOutdated(group.tokenUpdatedAt);
          const isEditing = editingGroupId === group.id;

          return (
            <div
              key={group.id}
              id={`group-card-${group.id}`}
              className={`p-4 rounded-xl border transition-all ${
                outdated 
                  ? 'border-amber-200 bg-amber-50/20' 
                  : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{group.name}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>آخرین بروزرسانی توکن: {formatDate(group.tokenUpdatedAt)}</span>
                    {outdated && (
                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[9px] font-bold">
                        نیاز به تمدید روزانه
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-emerald-600 font-medium">فعال</span>
                  </div>
                  <button
                    type="button"
                    id={`btn-delete-group-${group.id}`}
                    onClick={() => setConfirmDeleteGroupId(confirmDeleteGroupId === group.id ? null : group.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="حذف گروه"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {confirmDeleteGroupId === group.id && (
                <div className="mb-3 p-3 bg-rose-50/50 border border-rose-100 rounded-lg flex flex-col gap-2">
                  <p className="text-[10px] text-rose-800 font-bold leading-relaxed">
                    آیا از حذف این گروه اطمینان دارید؟ با حذف گروه، تمامی وب‌سرویس‌های وابسته به آن نیز برای همیشه حذف خواهند شد.
                  </p>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      id={`btn-cancel-delete-${group.id}`}
                      onClick={() => setConfirmDeleteGroupId(null)}
                      className="px-2 py-1 text-[10px] text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded animate-fade-in"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      id={`btn-confirm-delete-${group.id}`}
                      onClick={() => handleDeleteGroup(group.id)}
                      disabled={isSubmitting}
                      className="px-3 py-1 text-[10px] text-white bg-rose-600 hover:bg-rose-700 rounded font-semibold disabled:opacity-50"
                    >
                      {isSubmitting ? 'در حال حذف...' : 'حذف گروه'}
                    </button>
                  </div>
                </div>
              )}

              {/* Token Display & Editing Area */}
              <div className="bg-white border border-slate-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    توکن اهراز هویت گروه:
                  </span>
                  {!isEditing && (
                    <button
                      id={`btn-edit-token-${group.id}`}
                      onClick={() => handleStartEditToken(group)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      بروزرسانی توکن
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      id={`input-edit-token-${group.id}`}
                      value={tempToken}
                      onChange={(e) => setTempToken(e.target.value)}
                      placeholder="توکن جدید روزانه را در این بخش وارد کنید..."
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono bg-slate-50"
                      rows={2}
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingGroupId(null)}
                        className="px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100 rounded"
                      >
                        انصراف
                      </button>
                      <button
                        id={`btn-save-token-${group.id}`}
                        onClick={() => handleSaveToken(group.id)}
                        disabled={isSubmitting}
                        className="px-3 py-1 text-[10px] text-white bg-indigo-600 hover:bg-indigo-700 rounded font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        ذخیره توکن روزانه
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50/50 rounded p-1.5 border border-slate-100/50 overflow-hidden text-ellipsis">
                    <p className="font-mono text-[10px] text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px]">
                      {group.token ? group.token : 'بدون توکن (بدون احراز هویت)'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs">
            هیچ گروه کاری هنوز تعریف نشده است. با کلیک بر روی دکمه بالای صفحه اولین گروه را ایجاد کنید.
          </div>
        )}
      </div>
    </div>
  );
}
