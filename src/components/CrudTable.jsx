import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { Search, Plus, Edit2, Trash2, Printer, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Modal from './Modal';
import Badge from './Badge';

const PAGE_SIZE = 10;

const STATUS_FIELDS = ['status', 'الحالة', 'type', 'النوع', 'account_type', 'نوع الحساب'];
const AMOUNT_FIELDS = ['amount', 'المبلغ', 'balance', 'الرصيد', 'debit', 'مدين', 'credit', 'دائن',
  'unit_price', 'سعر الوحدة', 'salary', 'الراتب', 'basic_salary', 'الراتب الأساسي',
  'net_salary', 'صافي الراتب', 'deductions', 'الخصومات', 'value', 'القيمة', 'depreciation', 'الاستهلاك',
  'total_amount', 'الإجمالي'];

function formatCell(key, val) {
  if (val === null || val === undefined || val === '') return <span className="text-slate-700">—</span>;
  if (STATUS_FIELDS.includes(key)) return <Badge label={String(val)} />;
  if (AMOUNT_FIELDS.includes(key) && typeof val === 'number') {
    return <span className="font-mono text-amber-400">{formatCurrency(val)}</span>;
  }
  return <span className="text-slate-300">{String(val)}</span>;
}

export default function CrudTable({
  title,
  icon: TitleIcon,
  columns,       // [{ key, label, sortable? }]
  data,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
  addForm,       // JSX for the add/edit form
  editForm,      // If different form for edit; defaults to addForm
  addTitle,
  editTitle,
  addLabel,
  accentColor = '#6366f1',
  onPrint,        // optional: (row) => void — renders a print button per row
}) {
  const { t } = useTranslation();
  const { lang } = useApp();

  const userRole = localStorage.getItem('userRole') || 'Admin';
  const isAuditor = userRole === 'Auditor';
  const effectiveAddForm = isAuditor ? null : addForm;
  const effectiveEditForm = isAuditor ? null : editForm;
  const effectiveOnDelete = isAuditor ? null : onDelete;
  const hasActions = !!(effectiveEditForm || effectiveAddForm || effectiveOnDelete || onPrint);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data || [];
    const q = search.toLowerCase();
    return (data || []).filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), lang);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, lang]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = useCallback((key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }, [sortKey]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

  const handleDelete = async () => {
    if (onDelete && deleteRow) await onDelete(deleteRow);
    setDeleteRow(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header Card ── */}
      <div
        className="glass-strong rounded-2xl px-4 py-3 md:px-5 md:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderTop: `2px solid ${accentColor}40` }}
      >
        <div className="flex items-center gap-3">
          {TitleIcon && (
            <div
              className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}30` }}
            >
              <TitleIcon size={17} style={{ color: accentColor }} />
            </div>
          )}
          <div>
            <h1 className="text-sm md:text-base font-black text-slate-100">{title}</h1>
            <p className="text-xs text-slate-500 font-medium">{sorted.length} {lang === 'ar' ? 'سجل' : 'records'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search — full width on mobile, fixed on sm+ */}
          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-600 pointer-events-none" />
            <input
              className="erp-input pe-9 text-xs w-full sm:w-48"
              placeholder={t('search')}
              value={search}
              onChange={handleSearch}
            />
          </div>

          {/* Add button */}
          {effectiveAddForm && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-100 flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                boxShadow: `0 4px 16px ${accentColor}40`,
              }}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">{addLabel || t('add')}</span>
            </button>
          )}
        </div>
      </div>


      {/* ── Table Card ── */}
      <div className="glass-strong rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 gap-3">
              <Loader2 size={24} className="text-indigo-500 animate-spin-slow" />
              <span className="text-sm text-slate-500">{t('loading')}</span>
            </div>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-600">
              <div className="text-4xl">📋</div>
              <p className="text-sm font-medium">{t('no_data')}</p>
            </div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {columns.map(col => (
                    <th key={col.key}>
                      <button
                        className="flex items-center gap-1.5 font-bold text-slate-500 hover:text-slate-300 transition-colors duration-150"
                        onClick={() => col.sortable !== false && handleSort(col.key)}
                        style={{ cursor: col.sortable === false ? 'default' : 'pointer' }}
                      >
                        {col.label}
                        {col.sortable !== false && sortKey === col.key && (
                          sortDir === 'asc'
                            ? <ChevronUp size={12} className="text-indigo-400" />
                            : <ChevronDown size={12} className="text-indigo-400" />
                        )}
                      </button>
                    </th>
                  ))}
                  {hasActions && <th><span className="text-slate-500 font-bold">{t('actions')}</span></th>}
                </tr>
              </thead>
              <tbody>
                {paged.map((row, i) => (
                  <tr key={row.id ?? i} className="group">
                    {columns.map(col => (
                      <td key={col.key}>{formatCell(col.key, row[col.key])}</td>
                    ))}
                    {hasActions && (
                      <td>
                        <div className="flex items-center gap-1.5">
                          {(effectiveEditForm || effectiveAddForm) && (
                            <button
                              onClick={() => setEditRow(row)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all duration-150"
                              title={t('edit')}
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {effectiveOnDelete && (
                            <button
                              onClick={() => setDeleteRow(row)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150"
                              title={t('delete')}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          {onPrint && (
                            <button
                              onClick={() => onPrint(row)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-150"
                              title={lang === 'ar' ? 'طباعة' : 'Print'}
                            >
                              <Printer size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {!isLoading && sorted.length > PAGE_SIZE && (
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span className="text-xs text-slate-500">
              {t('page')} {page} {t('of')} {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
              >
                {lang === 'ar' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - page) <= 2)
                .map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all duration-150 ${
                      p === page
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/8'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
              >
                {lang === 'ar' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Modal ── */}
      {effectiveAddForm && (
        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={addTitle || t('add')}>
          {effectiveAddForm({ onClose: () => setShowAdd(false) })}
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {(effectiveEditForm || effectiveAddForm) && editRow && (
        <Modal isOpen={!!editRow} onClose={() => setEditRow(null)} title={editTitle || t('edit')}>
          {(effectiveEditForm || effectiveAddForm)({ row: editRow, onClose: () => setEditRow(null) })}
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteRow && effectiveOnDelete && (
        <Modal isOpen={!!deleteRow} onClose={() => setDeleteRow(null)} title={t('confirm_delete')} maxWidth={400}>
          <div className="flex flex-col items-center gap-5 text-center py-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-rose-500/10 border border-rose-500/20">
              🗑
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{t('confirm_delete')}</p>
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => setDeleteRow(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-all duration-150"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all duration-150 shadow-lg shadow-rose-500/25"
              >
                {t('yes_delete')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
