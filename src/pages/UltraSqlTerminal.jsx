import React, { useState, useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, ChevronRight, ChevronDown, Database, Table2, X,
  Download, Trash2, Clock, Copy, CheckCheck, AlertTriangle,
  Loader2, Terminal, History, Columns
} from 'lucide-react';
import { supabase, supabaseReady } from '../config/supabaseClient';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';

/* ─── ERP Schema definition ─── */
const ERP_SCHEMA = [
  { table: 'suppliers',         columns: ['id','supplier_id','company_name','contact_person','email','category','user_id'] },
  { table: 'purchase_invoices', columns: ['id','invoice_id','supplier_id','invoice_date','total_amount','status','user_id'] },
  { table: 'inventory',         columns: ['id','item_id','item_name','category','unit_price','quantity','user_id'] },
  { table: 'chart_of_accounts', columns: ['id','account_id','account_name','type','balance','user_id'] },
  { table: 'journal_entries',   columns: ['id','entry_id','date','description','debit','credit','user_id'] },
  { table: 'sales_invoices',    columns: ['id','invoice_id','customer_id','invoice_date','amount','status','user_id'] },
  { table: 'customers',         columns: ['id','customer_id','name','email','phone','company','user_id'] },
  { table: 'checks',            columns: ['id','check_id','check_number','bank_name','due_date','amount','type','user_id'] },
  { table: 'fixed_assets',      columns: ['id','asset_id','asset_name','purchase_date','value','depreciation','user_id'] },
  { table: 'employees',         columns: ['id','emp_id','name','position','department','salary','user_id'] },
  { table: 'payroll',           columns: ['id','payroll_id','emp_id','month_year','basic_salary','deductions','net_salary','user_id'] },
];

const MONACO_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword',   foreground: '22d3ee', fontStyle: 'bold' },
    { token: 'string',    foreground: '86efac' },
    { token: 'number',    foreground: 'fbbf24' },
    { token: 'comment',   foreground: '475569', fontStyle: 'italic' },
    { token: 'operator',  foreground: 'a78bfa' },
    { token: 'identifier',foreground: 'e2e8f0' },
  ],
  colors: {
    'editor.background':          '#030712',
    'editor.foreground':          '#e2e8f0',
    'editor.lineHighlightBackground': '#0f172a',
    'editorLineNumber.foreground':'#334155',
    'editorLineNumber.activeForeground': '#64748b',
    'editor.selectionBackground': '#1e3a5f',
    'editorCursor.foreground':    '#22d3ee',
    'editorWidget.background':    '#0f172a',
    'editorSuggestWidget.background': '#0f172a',
    'editorSuggestWidget.border': '#1e293b',
    'editorSuggestWidget.selectedBackground': '#1e3a5f',
    'scrollbar.shadow':           'transparent',
    'scrollbarSlider.background': '#1e293b',
    'scrollbarSlider.hoverBackground': '#334155',
  },
};

function exportCSV(rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]).join(',');
  const body = rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([headers + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `query_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ─── Schema Explorer ─── */
function SchemaExplorer({ onSelectTable }) {
  const [open, setOpen] = useState({});
  const toggle = (t) => setOpen(p => ({ ...p, [t]: !p[t] }));

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#030712', borderInlineEnd: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="px-3 py-3 flex items-center gap-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Database size={14} className="text-cyan-400 shrink-0" />
        <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">Schema</span>
        <span className="ms-auto text-[10px] text-slate-700 font-mono">{ERP_SCHEMA.length} tables</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-1.5">
        {ERP_SCHEMA.map(({ table, columns }) => (
          <div key={table} className="mb-0.5">
            <button
              onClick={() => { toggle(table); onSelectTable(table); }}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/8 transition-all duration-150 group"
            >
              {open[table] ? <ChevronDown size={11} className="text-cyan-400 shrink-0" /> : <ChevronRight size={11} className="text-slate-600 shrink-0" />}
              <Table2 size={12} className="text-cyan-500/70 shrink-0" />
              <span className="font-mono truncate">{table}</span>
              <span className="ms-auto text-[9px] text-slate-700 font-mono shrink-0">{columns.length}</span>
            </button>
            <AnimatePresence>
              {open[table] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                  {columns.map(col => (
                    <div key={col} className="flex items-center gap-1.5 ps-7 py-0.5 text-[11px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
                      <Columns size={9} className="shrink-0 text-slate-700" />
                      {col}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Results Pane ─── */
function ResultsPane({ result, isLoading, onExport, onClear }) {
  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center gap-3" style={{ background: '#030712' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
        <Loader2 size={22} className="text-cyan-400" />
      </motion.div>
      <span className="text-sm text-slate-500 font-mono">Executing query...</span>
    </div>
  );

  if (!result) return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#030712' }}>
      <div className="text-center">
        <Terminal size={28} className="text-slate-700 mx-auto mb-3" />
        <p className="text-xs text-slate-700 font-mono">Run a query to see results</p>
        <p className="text-[10px] text-slate-800 mt-1">Ctrl+Enter to execute</p>
      </div>
    </div>
  );

  // ── Strict rendering variables ──
  // Priority is determined by shape, not by what the query string said.
  const isError   = !Array.isArray(result) && !!result.error;
  const hasData   = Array.isArray(result) && result.length > 0;          // Tier 2 (CRITICAL)
  const isEmpty   = Array.isArray(result) && result.length === 0;         // Tier 3
  const isSuccess = !Array.isArray(result) && !result.error;              // Tier 4 (INSERT/UPDATE/DELETE)

  const rows = hasData ? result : [];
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
  const elapsed = result?.duration_ms ?? 0;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#030712' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          {isError ? (
            <span className="flex items-center gap-1.5 text-xs font-mono text-red-500"><AlertTriangle size={13} /> Error</span>
          ) : hasData ? (
            <span className="text-xs font-mono text-emerald-400">✓ {rows.length} row{rows.length !== 1 ? 's' : ''} · {elapsed}ms</span>
          ) : isSuccess ? (
            <span className="text-xs font-mono text-emerald-400">✓ Success · {elapsed}ms</span>
          ) : (
            <span className="text-xs font-mono text-slate-500">✓ 0 rows · {elapsed}ms</span>
          )}
        </div>
        <div className="ms-auto flex items-center gap-1.5">
          {hasData && (
            <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all border border-white/5">
              <Download size={12} /> CSV
            </button>
          )}
          <button onClick={onClear} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all border border-white/5">
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* ── Content — strict 4-tier hierarchy ── */}
      <div className="flex-1 overflow-auto p-4">

        {/* TIER 1 — ERROR */}
        {isError && (
          <div className="rounded-xl p-4 font-mono text-sm leading-relaxed" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 0 24px rgba(239,68,68,0.08) inset' }}>
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-red-500 font-bold text-xs mb-1">ERROR [{result.code || 'UNKNOWN'}]</div>
                <div className="text-red-400 text-xs">{result.error}</div>
              </div>
            </div>
          </div>
        )}

        {/* TIER 2 — DATA TABLE (ALWAYS wins over success message when data exists) */}
        {hasData && (
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <table className="w-full border-collapse text-xs font-mono">
              <thead className="sticky top-0 z-10">
                <tr style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)' }}>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 border-b border-white/10 w-8">#</th>
                  {cols.map(c => (
                    <th key={c} className="px-4 py-3 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider border-b border-white/10 whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5 text-slate-600 text-[10px]">{i + 1}</td>
                    {cols.map(c => {
                      const v = row[c];
                      const isNull = v === null || v === undefined;
                      const isNum  = typeof v === 'number';
                      const isBool = typeof v === 'boolean';
                      return (
                        <td key={c} className={`px-4 py-2.5 whitespace-nowrap ${isNull ? 'text-slate-600 italic' : isNum ? 'text-amber-400' : isBool ? 'text-purple-400' : 'text-slate-300'}`}>
                          {isNull ? 'NULL' : String(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TIER 3 — EMPTY SELECT */}
        {isEmpty && (
          <div className="flex items-center justify-center h-32 text-sm text-slate-400 font-mono">
            Query executed successfully, but returned 0 rows.
          </div>
        )}

        {/* TIER 4 — INSERT / UPDATE / DELETE SUCCESS (only when result is NOT an array) */}
        {isSuccess && (
          <div className="flex items-center justify-center h-32 text-sm text-emerald-500 font-mono">
            {result.message || 'تم التنفيذ بنجاح'}
          </div>
        )}

      </div>
    </div>
  );
}

/* ─── Main SQL Terminal ─── */
export default function UltraSqlTerminal() {
  const addToast = useToast();
  const { lang } = useApp();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const [query, setQuery] = useState('SELECT * FROM customers LIMIT 10;');
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lineCount, setLineCount] = useState(1);

  // Stable ref so Ctrl+Enter always calls the latest runQuery without stale closure
  const runQueryRef = useRef(null);

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.editor.defineTheme('obsidian', MONACO_THEME);
    monaco.editor.setTheme('obsidian');

    // Track line count for the indicator (doesn't cause re-render of Editor)
    editor.onDidChangeModelContent(() => {
      setLineCount(editor.getModel()?.getLineCount() ?? 1);
    });

    // Autocomplete
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: () => {
        const suggestions = [];
        ERP_SCHEMA.forEach(({ table, columns }) => {
          suggestions.push({ label: table, kind: monaco.languages.CompletionItemKind.Class, insertText: table, detail: 'ERP Table' });
          columns.forEach(col => suggestions.push({ label: col, kind: monaco.languages.CompletionItemKind.Field, insertText: col, detail: `Column of ${table}` }));
        });
        ['SELECT','FROM','WHERE','JOIN','ON','GROUP BY','ORDER BY','LIMIT','INSERT INTO','UPDATE','SET','DELETE FROM','COUNT','SUM','AVG','MAX','MIN'].forEach(kw =>
          suggestions.push({ label: kw, kind: monaco.languages.CompletionItemKind.Keyword, insertText: kw })
        );
        return { suggestions };
      }
    });

    // Ctrl+Enter — use ref so it always sees the latest runQuery
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      runQueryRef.current?.();
    });
  }, []);

  const runQuery = useCallback(async () => {
    // Always read directly from editor — no stale state dependency
    const q = (editorRef.current?.getValue() ?? '').trim();
    if (!q) { addToast('Empty query', 'warning'); return; }

    setIsRunning(true);
    setResult(null);
    const t0 = performance.now();

    try {
      if (!supabaseReady || !supabase) throw new Error('Supabase not configured');

      const cleanQuery = q.replace(/;\s*$/, '').trim();
      const { data, error } = await supabase.rpc('execute_raw_sql', { query: cleanQuery });
      if (error) throw error;

      const elapsed = Math.round(performance.now() - t0);

      // ── Preserve the result shape faithfully ──
      // If Supabase returns an array (SELECT), store it AS-IS so that
      // Array.isArray(result) === true in ResultsPane — never wrap it.
      // If it returns an object (INSERT/UPDATE/DELETE success), attach
      // a duration_ms field but keep the object shape intact.
      let res;
      if (Array.isArray(data)) {
        // Tag the array with a non-enumerable duration_ms so the table
        // renderer can read it without breaking Array.isArray().
        res = data;
        Object.defineProperty(res, 'duration_ms', { value: elapsed, enumerable: false, writable: true });
      } else {
        res = { ...(data ?? {}), duration_ms: data?.duration_ms ?? elapsed };
      }
      setResult(res);

      const count = Array.isArray(res) ? res.length : (res?.row_count ?? 0);
      if (res?.error) {
        addToast('SQL Error: ' + res.error.slice(0, 80), 'error');
      } else {
        const msg = (!Array.isArray(res) && res?.message) ? `✓ ${res.message}` : `✓ ${count} rows`;
        addToast(`${msg} · ${elapsed}ms`, 'success');
        setHistory(h => [{ query: q, time: new Date().toLocaleTimeString(), rows: count }, ...h].slice(0, 10));
      }
    } catch (err) {
      const errResult = { error: err.message, code: 'CLIENT_ERROR', duration_ms: Math.round(performance.now() - t0) };
      setResult(errResult);
      addToast('Error: ' + err.message.slice(0, 80), 'error');
    } finally {
      setIsRunning(false);
    }
  }, [addToast]); // removed `query` dependency — reads from editorRef directly

  // Keep the stable ref in sync so Ctrl+Enter always has latest version
  runQueryRef.current = runQuery;

  const handleCopy = async () => {
    const q = editorRef.current?.getValue() ?? '';
    await navigator.clipboard.writeText(q).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#030712', fontFamily: "'JetBrains Mono','Fira Code','Consolas',monospace" }}>

      {/* ─── Top Action Bar ─── */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 shrink-0" style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Terminal badge */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <span className="text-[11px] font-bold text-slate-500 tracking-widest uppercase ms-2">SQL Engine — Obsidian</span>
        </div>

        <div className="ms-auto flex items-center gap-2">
          {/* Copy */}
          <button onClick={handleCopy} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-slate-300 border border-white/5 hover:bg-white/5 transition-all">
            {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {/* History */}
          <div className="relative">
            <button onClick={() => setShowHistory(v => !v)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-amber-300 border border-white/5 hover:bg-amber-500/8 transition-all">
              <History size={12} /> History {history.length > 0 && <span className="bg-amber-500/20 text-amber-400 text-[9px] rounded-full px-1.5">{history.length}</span>}
            </button>
            <AnimatePresence>
              {showHistory && history.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.15 }}
                  className="absolute top-9 end-0 w-80 rounded-xl overflow-hidden shadow-2xl z-50"
                  style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="px-3 py-2.5 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">Query History</span>
                    <button onClick={() => setShowHistory(false)}><X size={12} className="text-slate-600" /></button>
                  </div>
                  {history.map((h, i) => (
                    <button key={i} onClick={() => { editorRef.current?.setValue(h.query); setShowHistory(false); }}
                      className="w-full px-3 py-2.5 border-b border-white/4 last:border-0 hover:bg-white/4 transition-colors text-start">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-600 font-mono">{h.time}</span>
                        <span className="text-[10px] text-amber-500 font-mono">{h.rows} rows</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">{h.query}</div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ▶ Run button */}
          <motion.button
            onClick={runQuery}
            disabled={isRunning}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-black transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: isRunning ? '#334155' : 'linear-gradient(135deg,#22d3ee,#0ea5e9)', boxShadow: isRunning ? 'none' : '0 0 20px rgba(34,211,238,0.35)' }}
          >
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {isRunning ? 'Running...' : 'Run Query'}
            {!isRunning && <span className="opacity-60 text-[10px] font-normal">Ctrl+↵</span>}
          </motion.button>
        </div>
      </div>

      {/* ─── 3-Pane Layout ─── */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">

          {/* LEFT: Schema Explorer */}
          <Panel defaultSize={18} minSize={12} maxSize={30}>
            <SchemaExplorer onSelectTable={(table) => {
              const q = `SELECT * FROM ${table} LIMIT 20;`;
              editorRef.current?.setValue(q);
              setQuery(q);
            }} />
          </Panel>

          <PanelResizeHandle className="w-px hover:w-0.5 transition-all cursor-col-resize" style={{ background: 'rgba(255,255,255,0.05)' }} />

          {/* RIGHT: Editor + Results */}
          <Panel defaultSize={82}>
            <PanelGroup direction="vertical">

              {/* TOP: Monaco Editor — UNCONTROLLED (defaultValue) to prevent cursor-reset bug */}
              <Panel defaultSize={55} minSize={30}>
                <div
                  className="relative w-full h-[60vh] z-10 flex-1 border border-white/10 rounded-lg overflow-hidden text-left"
                  dir="ltr"
                  style={{
                    background: '#030712',
                    // NO pointer-events restriction on this wrapper
                    isolation: 'isolate',
                  }}
                >
                  <Editor
                    height="100%"
                    language="sql"
                    defaultValue="SELECT * FROM customers LIMIT 10;"
                    // ⚠️  Do NOT pass value= here — that makes it controlled
                    // and causes a re-render→cursor-reset on every keystroke.
                    // We read content via editorRef.current.getValue() instead.
                    onMount={handleEditorMount}
                    options={{
                      minimap:                    { enabled: false },
                      automaticLayout:            true,
                      fontSize:                   14,
                      lineHeight:                 22,
                      fontFamily:                 "'JetBrains Mono','Fira Code','Consolas',monospace",
                      fontLigatures:              true,
                      padding:                    { top: 16, bottom: 16 },
                      scrollBeyondLastLine:       false,
                      renderLineHighlight:        'line',
                      cursorBlinking:             'smooth',
                      cursorSmoothCaretAnimation: 'on',
                      smoothScrolling:            true,
                      wordWrap:                   'on',
                      formatOnPaste:              true,
                      suggest:                    { showWords: false },
                      // readOnly must be false (default) — never set to true
                      readOnly:                   false,
                    }}
                    theme="obsidian"
                  />
                  {/* Line count — pointer-events-none so it never blocks the editor */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      insetInlineEnd: 16,
                      pointerEvents: 'none',
                      zIndex: 1,
                      fontSize: 10,
                      color: '#334155',
                      fontFamily: 'monospace',
                    }}
                  >
                    {lineCount} {lineCount === 1 ? 'line' : 'lines'}
                  </div>
                </div>
              </Panel>

              <PanelResizeHandle className="h-px hover:h-0.5 transition-all cursor-row-resize" style={{ background: 'rgba(255,255,255,0.05)' }} />

              {/* BOTTOM: Results */}
              <Panel defaultSize={45} minSize={20}>
                <motion.div
                  className="h-full overflow-hidden"
                  initial={false}
                  animate={result || isRunning ? { opacity: 1 } : { opacity: 0.6 }}
                  transition={{ duration: 0.3 }}
                >
                  <ResultsPane
                    result={result}
                    isLoading={isRunning}
                    onExport={() => exportCSV(Array.isArray(result) ? result : result?.rows)}
                    onClear={() => setResult(null)}
                  />
                </motion.div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
