import React, {
  useEffect, useState, useRef, useCallback, useMemo,
} from 'react';
import { supabase } from './lib/supabaseClient';
import {
  LogOut, Plus, RefreshCw, X, ChevronRight, Search,
  Building2, BarChart2, LayoutDashboard, TrendingUp, TrendingDown,
  DollarSign, Trash2, PieChartIcon, ChevronDown, ChevronUp, Check,
  ArrowUpDown, Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine,
} from 'recharts';

// ═══════════════════════════════════════════════════════════════════
// 常數
// ═══════════════════════════════════════════════════════════════════
const ASSET_TYPES = [
  { value: 'crypto',    label: '加密資產', emoji: '🪙', color: '#FFA500', bg: 'bg-indigo-500/10',  text: 'text-indigo-400'  },
  { value: 'stock',     label: '股票證券', emoji: '📈', color: '#3b82f6', bg: 'bg-blue-500/10',    text: 'text-blue-400'    },
  { value: 'cash',      label: '現金存款', emoji: '💵', color: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  { value: 'liability', label: '欠款負債', emoji: '💳', color: '#f43f5e', bg: 'bg-rose-500/10',    text: 'text-rose-400'    },
];

const EXCHANGES = [
  'Binance', 'Bybit', 'OKX', 'Coinbase', 'Kraken', 'Crypto.com',
  'Bitfinex', 'KuCoin', 'Gate.io', 'Pionex', 'MAX', 'ACE',
  'Trust', 'Ledger', '現貨錢包', '冷錢包', '其他',
];

const CASH_CURRENCIES = [
  { value: 'TWD', label: '🇹🇼 台幣',   symbol: 'NT$' },
  { value: 'USD', label: '🇺🇸 美元',   symbol: '$'   },
  { value: 'HKD', label: '🇭🇰 港幣',   symbol: 'HK$' },
  { value: 'JPY', label: '🇯🇵 日圓',   symbol: '¥'   },
  { value: 'EUR', label: '🇪🇺 歐元',   symbol: '€'   },
  { value: 'GBP', label: '🇬🇧 英鎊',   symbol: '£'   },
  { value: 'SGD', label: '🇸🇬 新幣',   symbol: 'S$'  },
  { value: 'CNY', label: '🇨🇳 人民幣', symbol: '¥'   },
];

const SORT_OPTIONS = [
  { value: 'value_desc', label: '總值（高→低）' },
  { value: 'value_asc',  label: '總值（低→高）' },
  { value: 'roi_desc',   label: 'ROI（高→低）'  },
  { value: 'roi_asc',    label: 'ROI（低→高）'  },
  { value: 'name_asc',   label: '名稱（A→Z）'   },
];

const PALETTE = [
  '#6366f1','#3b82f6','#10b981','#f59e0b','#ec4899',
  '#8b5cf6','#06b6d4','#84cc16','#f97316','#14b8a6',
  '#a78bfa','#fb7185','#34d399','#fbbf24','#60a5fa',
];

// ✅ 9. 走勢圖線條定義
const TREND_LINES = [
  { key: '淨資產',   color: '#6366f1', label: '淨資產' },
  { key: '加密貨幣', color: '#FFA500', label: '加密' },
  { key: '股票',     color: '#3b82f6', label: '股票' },
  { key: '現金',     color: '#10b981', label: '現金' },
];

const getCashCurrencyCfg = (cur) => CASH_CURRENCIES.find(c => c.value === cur) ?? CASH_CURRENCIES[0];
const getTypeCfg = (type) => ASSET_TYPES.find(t => t.value === type) ?? ASSET_TYPES[0];
const fmt = (n, dec = 0) => n?.toLocaleString(undefined, { maximumFractionDigits: dec }) ?? '0';

// ═══════════════════════════════════════════════════════════════════
// ModalOverlay
// ═══════════════════════════════════════════════════════════════════
function ModalOverlay({ children, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
    }} onClick={onClose}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: '22rem',
        maxHeight: '92vh', overflowY: 'auto',
        padding: '1rem', boxSizing: 'border-box',
      }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 共用元件
// ═══════════════════════════════════════════════════════════════════
const FormInput = React.memo(({ label, value, onChange, placeholder, type = 'text', error, prefix }) => (
  <div>
    {label && <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">{label}</label>}
    <div className="relative">
      {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">{prefix}</span>}
      <input type={type} step="any" placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        className={['w-full bg-[#0c0c0c] rounded-2xl py-4 text-sm transition-all focus:outline-none focus:ring-2',
          prefix ? 'pl-9 pr-5' : 'px-5',
          error ? 'ring-2 ring-rose-500/60' : 'ring-white/5 focus:ring-indigo-500/50',
        ].join(' ')} />
    </div>
    {error && <p className="text-rose-400 text-[10px] mt-1.5 ml-1">{error}</p>}
  </div>
));

const ExchangePicker = React.memo(({ value, onChange }) => (
  <div>
    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
      <Building2 size={10} />交易所 / 錢包
    </label>
    <div className="flex flex-wrap gap-2">
      {EXCHANGES.map(ex => (
        <button key={ex} type="button" onClick={() => onChange(value === ex ? '' : ex)}
          className={['px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
            value === ex
              ? 'bg-indigo-500 border-indigo-500 text-white'
              : 'bg-[#0c0c0c] border-white/8 text-gray-500 hover:text-white hover:border-white/20',
          ].join(' ')}>
          {ex}
        </button>
      ))}
    </div>
  </div>
));

const MarketPicker = React.memo(({ value, onChange }) => (
  <div>
    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">市場</label>
    <div className="flex bg-[#0c0c0c] rounded-2xl p-1 gap-1">
      {[{ v: 'TW', l: '🇹🇼 台股' }, { v: 'US', l: '🇺🇸 美股' }].map(opt => (
        <button key={opt.v} type="button" onClick={() => onChange(value === opt.v ? '' : opt.v)}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all
            ${value === opt.v ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>
          {opt.l}
        </button>
      ))}
    </div>
  </div>
));

const CashCurrencyPicker = React.memo(({ value, onChange }) => (
  <div>
    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">存款幣別</label>
    <div className="grid grid-cols-2 gap-2">
      {CASH_CURRENCIES.map(cur => (
        <button key={cur.value} type="button" onClick={() => onChange(cur.value)}
          className={['flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border',
            value === cur.value
              ? 'bg-indigo-500 border-indigo-500 text-white'
              : 'bg-[#0c0c0c] border-white/8 text-gray-500 hover:text-white hover:border-white/20',
          ].join(' ')}>
          <span>{cur.label}</span>
          <span className="ml-auto text-[10px] opacity-60">{cur.symbol}</span>
        </button>
      ))}
    </div>
  </div>
));

// ═══════════════════════════════════════════════════════════════════
// DonutChart
// ═══════════════════════════════════════════════════════════════════
function DonutChart({ segments, size = 210, strokeWidth = 24, net, curSym, roi, profit, stats }) {
  const [activeSegment, setActiveSegment] = useState(null);
  const PAD = 62;
  const vb = size + PAD * 2;
  const cx = vb / 2;
  const cy = vb / 2;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const GAP_PX = 3;
  const filtered = segments.filter(s => s.pct > 0.3);
  let cum = 0;
  const arcs = filtered.map(s => {
    const arcLen = (s.pct / 100) * circ;
    const offset = -(cum / 100) * circ;
    const midAngle = (cum + s.pct / 2) / 100 * 2 * Math.PI - Math.PI / 2;
    cum += s.pct;
    return { ...s, arcLen, offset, midAngle };
  });

  const handleArcClick = (seg) => setActiveSegment(prev => prev?.label === seg.label ? null : seg);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width={vb} height={vb} viewBox={`0 0 ${vb} ${vb}`} style={{ display: 'block', overflow: 'visible' }}>
        <g transform={`rotate(-90, ${cx}, ${cy})`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1f1f1f" strokeWidth={strokeWidth} />
          {arcs.map((a, i) => {
            const gapCirc = (GAP_PX / r) * r;
            const arcL = Math.max(0, a.arcLen - gapCirc);
            const isActive = activeSegment?.label === a.label;
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={a.color} strokeWidth={isActive ? strokeWidth + 4 : strokeWidth - 2}
                strokeLinecap="butt" strokeDasharray={`${arcL} ${circ}`} strokeDashoffset={a.offset}
                style={{ cursor: 'pointer', transition: 'stroke-width 0.15s ease' }}
                onClick={() => handleArcClick(a)} />
            );
          })}
        </g>
        {arcs.map((a, i) => {
          if (a.pct < 5) return null;
          const cos = Math.cos(a.midAngle);
          const sin = Math.sin(a.midAngle);
          const outerEdge = r + strokeWidth / 2;
          const x1 = cx + (outerEdge + 4) * cos; const y1 = cy + (outerEdge + 4) * sin;
          const x2 = cx + (outerEdge + 18) * cos; const y2 = cy + (outerEdge + 18) * sin;
          const tx = cx + (outerEdge + 22) * cos; const ty = cy + (outerEdge + 22) * sin;
          const anchor = cos >= 0 ? 'start' : 'end';
          const cfg = ASSET_TYPES.find(t => t.value === a.label);
          return (
            <g key={i} style={{ cursor: 'pointer' }} onClick={() => handleArcClick(a)}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#444" strokeWidth={2} />
              <text x={tx} y={ty - 4} textAnchor={anchor} fill="#d1d5db" fontSize={12} fontWeight="700">{cfg?.label ?? a.label}</text>
              <text x={tx} y={ty + 8} textAnchor={anchor} fill={a.color} fontSize={12} fontWeight="600">{a.pct.toFixed(1)}%</text>
            </g>
          );
        })}
        <text x={cx} y={cy - 10} textAnchor="middle" fill="#d3d3d3" fontSize={12} fontWeight="1000" letterSpacing="0.2em">淨資產</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#fff" fontSize={18} fontWeight="700">{curSym}{fmt(net)}</text>
        <text x={cx} y={cy + 32} textAnchor="middle" fill={profit >= 0 ? '#34d399' : '#f43f5e'} fontSize={12} fontWeight="700">
          {profit >= 0 ? '▲' : '▼'} {Math.abs(roi).toFixed(1)}%
        </text>
      </svg>
      <AnimatePresence>
        {activeSegment && (() => {
          const cfg = ASSET_TYPES.find(t => t.value === activeSegment.label);
          const value = stats?.[activeSegment.label] ?? 0;
          return (
            <motion.div key={activeSegment.label}
              initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }} transition={{ duration: 0.15 }}
              style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '12px 20px', minWidth: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', textAlign: 'center' }}>
                <button onClick={() => setActiveSegment(null)} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14 }}>✕</button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: activeSegment.color, display: 'inline-block' }} />
                  <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cfg?.label ?? activeSegment.label}</span>
                </div>
                <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{curSym}{fmt(value)}</div>
                <div style={{ color: activeSegment.color, fontSize: 12, fontWeight: 600, marginTop: 2 }}>{activeSegment.pct.toFixed(1)}% 佔比</div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LabeledPieChart
// ═══════════════════════════════════════════════════════════════════
const RADIAN = Math.PI / 180;
function renderCustomLabel({ cx, cy, midAngle, outerRadius, name, percent }) {
  if (percent < 0.04) return null;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const lx1 = cx + (outerRadius + 6) * Math.cos(-midAngle * RADIAN);
  const ly1 = cy + (outerRadius + 6) * Math.sin(-midAngle * RADIAN);
  const lx2 = cx + (outerRadius + 20) * Math.cos(-midAngle * RADIAN);
  const ly2 = cy + (outerRadius + 20) * Math.sin(-midAngle * RADIAN);
  const anchor = x > cx ? 'start' : 'end';
  return (
    <g>
      <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="#555" strokeWidth={2} />
      <text x={x} y={y - 5} textAnchor={anchor} fill="#d1d5db" fontSize={12} fontWeight="700">{name.length > 8 ? name.slice(0, 8) + '…' : name}</text>
      <text x={x} y={y + 8} textAnchor={anchor} fill="#9ca3af" fontSize={12}>{(percent * 100).toFixed(1)}%</text>
    </g>
  );
}

function LabeledPieChart({ data, size = 280, netWorth, curSym, centerLabel = '淨資產' }) {
  if (!data?.length) return <div className="text-center py-10 text-gray-700 text-xs">尚無資產</div>;
  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart margin={{ top: 24, right: 40, bottom: 24, left: 40 }}>
        <Pie data={data} cx="50%" cy="50%" innerRadius={size * 0.23} outerRadius={size * 0.32}
          dataKey="value" paddingAngle={2} labelLine={false} label={renderCustomLabel} strokeWidth={0}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip contentStyle={{ background: '#fff', border: 'none', borderRadius: '0.75rem', fontSize: 12, color: '#111', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '10px 14px' }}
          itemStyle={{ color: '#111', fontWeight: 700 }} formatter={(v, n) => [fmt(v), n]} />
        {netWorth !== undefined && (
          <>
            <text x="50%" y="45%" fill="#d3d3d3" textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight={900} letterSpacing={1}>{centerLabel}</text>
            <text x="50%" y="55%" fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize={18} fontWeight={700}>{curSym}{fmt(netWorth)}</text>
          </>
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ChartTooltip
// ═══════════════════════════════════════════════════════════════════
const ChartTooltip = ({ active, payload, label, prefix = 'NT$' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minWidth: 140 }}>
      {label && <p style={{ color: '#888', marginBottom: 6, fontSize: 11 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: i < payload.length - 1 ? 4 : 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color ?? p.stroke, flexShrink: 0 }} />
          <span style={{ color: '#555' }}>{p.name}</span>
          <span style={{ fontWeight: 700, color: '#111', marginLeft: 'auto', paddingLeft: 12 }}>{prefix}{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// AddChartModal
// ═══════════════════════════════════════════════════════════════════
function AddChartModal({ isOpen, onClose, onSave, assets, getVal }) {
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set(['crypto', 'stock', 'cash', 'liability']));
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) { setTitle(''); setSelected(new Set()); setExpanded(new Set(['crypto', 'stock', 'cash', 'liability'])); setError(''); }
  }, [isOpen]);

  const toggleAsset = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleType = (type) => {
    const ids = assets.filter(a => a.type === type).map(a => a.id);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => { const n = new Set(prev); allSelected ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n; });
  };
  const toggleExpand = (type) => setExpanded(prev => { const n = new Set(prev); n.has(type) ? n.delete(type) : n.add(type); return n; });
  const selectAll = () => setSelected(new Set(assets.map(a => a.id)));
  const submit = () => {
    if (!title.trim()) { setError('請輸入圖表名稱'); return; }
    if (selected.size === 0) { setError('請至少選擇一個資產'); return; }
    onSave({ title: title.trim(), asset_ids: [...selected] });
  };

  const groupedForModal = ASSET_TYPES.map(t => ({ ...t, items: assets.filter(a => a.type === t.value) })).filter(g => g.items.length > 0);
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <ModalOverlay onClose={onClose}>
        <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          className="bg-[#141414] w-full rounded-[2rem] border border-white/8 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h3 className="font-bold text-base">新增配置圖</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all"><X size={15} /></button>
          </div>
          <div className="px-5 pb-6 space-y-4">
            <FormInput label="圖表名稱" value={title} onChange={v => { setTitle(v); setError(''); }} placeholder="例如：加密資產配置" error={error === '請輸入圖表名稱' ? error : ''} />
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">選擇資產</label>
                <button onClick={selectAll} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition-colors">全選</button>
              </div>
              <div className="space-y-2">
                {groupedForModal.map(group => {
                  const groupIds = group.items.map(a => a.id);
                  const allChk = groupIds.every(id => selected.has(id));
                  const someChk = groupIds.some(id => selected.has(id));
                  const isExp = expanded.has(group.value);
                  const isLiability = group.value === 'liability';
                  return (
                    <div key={group.value} className={`rounded-2xl overflow-hidden ${isLiability ? 'bg-rose-500/5 border border-rose-500/10' : 'bg-[#0c0c0c]'}`}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button onClick={() => toggleType(group.value)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all
                            ${allChk ? (isLiability ? 'bg-rose-500 border-rose-500' : 'bg-indigo-500 border-indigo-500')
                              : someChk ? (isLiability ? 'bg-rose-500/30 border-rose-500/50' : 'bg-indigo-500/30 border-indigo-500/50')
                              : 'border-white/20 bg-transparent'}`}>
                          {(allChk || someChk) && <Check size={11} className="text-white" strokeWidth={3} />}
                        </button>
                        <span className="text-sm">{group.emoji}</span>
                        <span className={`text-sm font-semibold flex-1 ${isLiability ? 'text-rose-400' : ''}`}>{group.label}</span>
                        <span className="text-xs text-gray-600">{groupIds.filter(id => selected.has(id)).length}/{group.items.length}</span>
                        <button onClick={() => toggleExpand(group.value)} className="text-gray-600 hover:text-gray-400 transition-colors">
                          {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                      {isExp && group.items.map(asset => (
                        <button key={asset.id} onClick={() => toggleAsset(asset.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-white/4 hover:bg-white/3 transition-all">
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-all
                            ${selected.has(asset.id) ? (isLiability ? 'bg-rose-500 border-rose-500' : 'bg-indigo-500 border-indigo-500') : 'border-white/20 bg-transparent'}`}>
                            {selected.has(asset.id) && <Check size={9} className="text-white" strokeWidth={3} />}
                          </div>
                          <span className="text-xs text-gray-300 flex-1 text-left truncate">{asset.name}</span>
                          <span className="text-[10px] text-gray-600">{asset.symbol}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
              {error === '請至少選擇一個資產' && <p className="text-rose-400 text-[10px] mt-2 ml-1">{error}</p>}
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 bg-white/5 text-gray-400 font-bold py-4 rounded-2xl text-sm hover:bg-white/8 transition-all">取消</button>
              <button onClick={submit} className="flex-[2] bg-white text-black font-bold py-4 rounded-2xl text-sm hover:bg-gray-100 transition-all">建立圖表 {selected.size > 0 && `(${selected.size})`}</button>
            </div>
          </div>
        </motion.div>
      </ModalOverlay>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AddAssetModal
// ═══════════════════════════════════════════════════════════════════
function AddAssetModal({ isOpen, onClose, onSaveCrypto, onSaveManual, displayCurrency }) {
  const [step, setStep] = useState('type-select');
  const [assetType, setAssetType] = useState('stock');
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [errors, setErrors] = useState({});
  const searchTimeout = useRef(null);
  const [fName, setFName] = useState(''); const [fSymbol, setFSymbol] = useState('');
  const [fAmount, setFAmount] = useState(''); const [fCost, setFCost] = useState('');
  const [fPrice, setFPrice] = useState(''); const [fDebt, setFDebt] = useState('');
  const [fExchange, setFExchange] = useState(''); const [fMarket, setFMarket] = useState('');
  const [fCashCurrency, setFCashCurrency] = useState(displayCurrency);

  const stockCostCurrency = fMarket === 'TW' ? 'TWD' : fMarket === 'US' ? 'USD' : displayCurrency;
  const stockCostSym = stockCostCurrency === 'TWD' ? 'NT$' : '$';
  const curSym = displayCurrency === 'TWD' ? 'NT$' : '$';

  const resetAll = useCallback(() => {
    setStep('type-select'); setSelectedCoin(null); setSearchQuery(''); setSearchResults([]); setErrors({});
    setFName(''); setFSymbol(''); setFAmount(''); setFCost(''); setFPrice(''); setFDebt(''); setFExchange(''); setFMarket('');
    setFCashCurrency(displayCurrency);
  }, [displayCurrency]);

  useEffect(() => { if (isOpen) resetAll(); }, [isOpen, resetAll]);

  const handleSearch = useCallback((q) => {
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (!q) { setSearchResults([]); return; }
    setSearching(true);
    searchTimeout.current = setTimeout(() => {
      fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`)
        .then(r => r.json()).then(d => { setSearchResults(d.coins?.slice(0, 7) ?? []); setSearching(false); })
        .catch(() => setSearching(false));
    }, 380);
  }, []);

  const submitCrypto = () => {
    const e = {};
    if (!fAmount || isNaN(fAmount) || +fAmount <= 0) e.amount = '請輸入有效數量';
    if (!fCost || isNaN(fCost)) e.cost = '請輸入買入成本';
    if (Object.keys(e).length) { setErrors(e); return; }
    onSaveCrypto({ coin: selectedCoin, amount: +fAmount, cost_basis: +fCost, exchange: fExchange, cost_currency: displayCurrency });
  };

  const submitManual = () => {
    const e = {};
    if (!fName.trim()) e.name = '請輸入名稱';
    if (assetType === 'liability') { if (!fDebt || isNaN(fDebt) || +fDebt <= 0) e.debt = '請輸入欠款總額'; }
    else if (assetType === 'cash') { if (!fAmount || isNaN(fAmount) || +fAmount <= 0) e.amount = '請輸入存款金額'; }
    else {
      if (!fSymbol.trim()) e.symbol = '請輸入代號';
      if (!fAmount || isNaN(fAmount) || +fAmount <= 0) e.amount = '請輸入數量';
      if (!fCost || isNaN(fCost)) e.cost = '請輸入成本';
      if (!fPrice || isNaN(fPrice)) e.price = '請輸入市價';
    }
    if (Object.keys(e).length) { setErrors(e); return; }
    if (assetType === 'liability') onSaveManual({ name: fName.trim(), symbol: 'DEBT', type: 'liability', amount: 1, cost_basis: +fDebt, manual_price: +fDebt, coin_id: 'm-' + Date.now(), cost_currency: displayCurrency });
    else if (assetType === 'cash') onSaveManual({ name: fName.trim(), symbol: fCashCurrency, type: 'cash', amount: +fAmount, cost_basis: +fAmount, manual_price: 1, coin_id: 'm-' + Date.now(), cost_currency: fCashCurrency, cash_currency: fCashCurrency });
    else onSaveManual({ name: fName.trim(), symbol: fSymbol.trim().toUpperCase(), type: assetType, amount: +fAmount, cost_basis: +fCost, manual_price: +fPrice, coin_id: 'm-' + Date.now(), market: fMarket || null, cost_currency: stockCostCurrency });
  };

  const goBack = () => { if (step === 'crypto-detail') setStep('crypto-search'); else setStep('type-select'); };
  const stepTitle = { 'type-select': '新增資產', 'crypto-search': '搜尋代幣', 'crypto-detail': selectedCoin?.name ?? '加密貨幣', 'manual-form': getTypeCfg(assetType).label }[step];
  const cashCurSym = getCashCurrencyCfg(fCashCurrency).symbol;

  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <ModalOverlay onClose={onClose}>
        <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          className="bg-[#141414] w-full rounded-[2rem] border border-white/8 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              {step !== 'type-select' && <button onClick={goBack} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all">←</button>}
              <h3 className="font-bold text-base">{stepTitle}</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all"><X size={15} /></button>
          </div>
          {step === 'type-select' && (
            <div className="px-5 pb-6 grid grid-cols-2 gap-3">
              {ASSET_TYPES.map(t => (
                <button key={t.value} onClick={() => { setAssetType(t.value); setStep(t.value === 'crypto' ? 'crypto-search' : 'manual-form'); }}
                  className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-[#1c1c1c] border border-white/5 hover:border-white/20 hover:bg-[#222] transition-all">
                  <span className="text-2xl">{t.emoji}</span>
                  <div className="text-left">
                    <p className="font-bold text-sm">{t.label}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {t.value === 'crypto' && 'BTC, ETH, SOL...'}{t.value === 'stock' && '台積電, AAPL...'}
                      {t.value === 'cash' && '台幣/美元/港幣...'}{t.value === 'liability' && '信用卡, 貸款'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {step === 'crypto-search' && (
            <div className="px-5 pb-6">
              <div className="relative mb-4">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input autoFocus value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="搜尋 BTC, ETH, SOL..."
                  className="w-full bg-[#0c0c0c] rounded-2xl py-3.5 pl-10 pr-5 text-sm focus:outline-none focus:ring-2 ring-white/5 focus:ring-indigo-500/50 transition-all" />
                {searching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />}
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {searchResults.map(coin => (
                  <button key={coin.id} onClick={() => { setSelectedCoin(coin); setStep('crypto-detail'); }}
                    className="w-full flex items-center justify-between p-3.5 bg-[#0c0c0c] hover:bg-[#1c1c1c] rounded-2xl transition-all group">
                    <div className="flex items-center gap-3">
                      <img src={coin.thumb} alt="" className="w-9 h-9 rounded-full bg-white/5 flex-shrink-0" />
                      <div className="text-left"><p className="font-semibold text-sm">{coin.name}</p><p className="text-[10px] text-gray-500 font-mono uppercase">{coin.symbol}</p></div>
                    </div>
                    <ChevronRight size={15} className="text-gray-700 group-hover:text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 'crypto-detail' && selectedCoin && (
            <div className="px-5 pb-6 space-y-4">
              <div className="flex items-center gap-3 bg-[#0c0c0c] rounded-2xl p-4">
                <img src={selectedCoin.large ?? selectedCoin.thumb} alt="" className="w-11 h-11 rounded-full bg-white/5 flex-shrink-0" />
                <div><p className="font-bold">{selectedCoin.name}</p><p className="text-[10px] text-gray-500 font-mono uppercase">{selectedCoin.symbol}</p></div>
              </div>
              <ExchangePicker value={fExchange} onChange={setFExchange} />
              <FormInput label="持有數量" value={fAmount} onChange={v => { setFAmount(v); setErrors(er => ({ ...er, amount: '' })); }} placeholder="0.00000" type="number" error={errors.amount} />
              <FormInput label={`買入成本 / 顆 (${displayCurrency})`} value={fCost} onChange={v => { setFCost(v); setErrors(er => ({ ...er, cost: '' })); }} placeholder="0.00" type="number" prefix={curSym} error={errors.cost} />
              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 bg-white/5 text-gray-400 font-bold py-4 rounded-2xl text-sm hover:bg-white/8 transition-all">取消</button>
                <button onClick={submitCrypto} className="flex-[2] bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-4 rounded-2xl text-sm transition-all">新增代幣</button>
              </div>
            </div>
          )}
          {step === 'manual-form' && (
            <div className="px-5 pb-6 space-y-4">
              {assetType === 'liability' ? (
                <>
                  <FormInput label="負債名稱" value={fName} onChange={v => { setFName(v); setErrors(er => ({ ...er, name: '' })); }} placeholder="信用卡債" error={errors.name} />
                  <FormInput label={`欠款總額 (${displayCurrency})`} value={fDebt} onChange={v => { setFDebt(v); setErrors(er => ({ ...er, debt: '' })); }} placeholder="0" type="number" prefix={curSym} error={errors.debt} />
                </>
              ) : assetType === 'cash' ? (
                <>
                  <FormInput label="帳戶名稱" value={fName} onChange={v => { setFName(v); setErrors(er => ({ ...er, name: '' })); }} placeholder="台幣活存" error={errors.name} />
                  <CashCurrencyPicker value={fCashCurrency} onChange={setFCashCurrency} />
                  <FormInput label={`存款金額 (${fCashCurrency})`} value={fAmount} onChange={v => { setFAmount(v); setErrors(er => ({ ...er, amount: '' })); }} placeholder="0" type="number" prefix={cashCurSym} error={errors.amount} />
                </>
              ) : (
                <>
                  <MarketPicker value={fMarket} onChange={setFMarket} />
                  {fMarket && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/8 border border-indigo-500/15 rounded-xl">
                      <span className="text-indigo-400 text-xs">ℹ</span>
                      <p className="text-[10px] text-indigo-400">{fMarket === 'TW' ? '台股：成本與市價以 TWD（台幣）記錄' : '美股：成本與市價以 USD（美元）記錄'}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput label="名稱" value={fName} onChange={v => { setFName(v); setErrors(er => ({ ...er, name: '' })); }} placeholder="台積電" error={errors.name} />
                    <FormInput label="代號" value={fSymbol} onChange={v => { setFSymbol(v); setErrors(er => ({ ...er, symbol: '' })); }} placeholder="2330" error={errors.symbol} />
                  </div>
                  <FormInput label="持有數量" value={fAmount} onChange={v => { setFAmount(v); setErrors(er => ({ ...er, amount: '' })); }} placeholder="100" type="number" error={errors.amount} />
                  <FormInput label={`成本 (${stockCostCurrency})`} value={fCost} onChange={v => { setFCost(v); setErrors(er => ({ ...er, cost: '' })); }} placeholder="0.00" type="number" prefix={stockCostSym} error={errors.cost} />
                  <FormInput label={`市價 (${stockCostCurrency})`} value={fPrice} onChange={v => { setFPrice(v); setErrors(er => ({ ...er, price: '' })); }} placeholder="0.00" type="number" prefix={stockCostSym} error={errors.price} />
                </>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 bg-white/5 text-gray-400 font-bold py-4 rounded-2xl text-sm hover:bg-white/8 transition-all">取消</button>
                <button onClick={submitManual} className="flex-[2] bg-white text-black font-bold py-4 rounded-2xl text-sm hover:bg-gray-100 transition-all">新增資產</button>
              </div>
            </div>
          )}
        </motion.div>
      </ModalOverlay>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EditModal
// ═══════════════════════════════════════════════════════════════════
function EditModal({ asset, isOpen, onClose, onUpdate, onDelete, displayCurrency }) {
  const [amount, setAmount] = useState(''); const [cost, setCost] = useState('');
  const [price, setPrice] = useState(''); const [debt, setDebt] = useState('');
  const [cashAmt, setCashAmt] = useState(''); const [cashCurrency, setCashCurrency] = useState('TWD');
  const [exchange, setExchange] = useState(''); const [market, setMarket] = useState('');

  useEffect(() => {
    if (!asset) return;
    setAmount(String(asset.amount ?? '')); setCost(String(asset.cost_basis ?? ''));
    setPrice(String(asset.manual_price ?? '')); setDebt(String(asset.type === 'liability' ? (asset.manual_price ?? '') : ''));
    setCashAmt(String(asset.type === 'cash' ? (asset.amount ?? '') : ''));
    setCashCurrency(asset.cash_currency ?? asset.cost_currency ?? 'TWD');
    setExchange(String(asset.exchange ?? '')); setMarket(String(asset.market ?? ''));
  }, [asset]);

  if (!asset || !isOpen) return null;
  const cfg = getTypeCfg(asset.type);
  const costCur = asset.cost_currency ?? displayCurrency;
  const costCurSym = costCur === 'TWD' ? 'NT$' : '$';
  const cashCurSym = getCashCurrencyCfg(cashCurrency).symbol;
  const originalDebt = asset.cost_basis ?? 0;
  const currentDebt = +debt || 0;
  const debtProgress = originalDebt > 0 ? Math.max(0, Math.min(1, 1 - currentDebt / originalDebt)) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const updates = {};
    if (asset.type === 'liability') updates.manual_price = +debt;
    else if (asset.type === 'cash') { updates.amount = +cashAmt; updates.cost_basis = +cashAmt; updates.cash_currency = cashCurrency; updates.cost_currency = cashCurrency; updates.symbol = cashCurrency; }
    else { updates.amount = +amount; updates.cost_basis = +cost; updates.manual_price = +price; updates.exchange = exchange || null; updates.market = market || null; }
    onUpdate(asset.id, updates);
  };

  return (
    <AnimatePresence>
      <ModalOverlay onClose={onClose}>
        <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
          className="bg-[#141414] w-full rounded-[2rem] border border-white/8 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center text-xl`}>{cfg.emoji}</div>
              <div><h3 className="font-bold text-base">{asset.name}</h3><p className="text-[10px] text-gray-500 font-mono uppercase">{asset.symbol}</p></div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all"><X size={15} /></button>
          </div>
          <form onSubmit={handleSubmit} className="px-5 pb-6 pt-4 space-y-4">
            {asset.type === 'liability' ? (
              <>
                <div className="bg-[#0c0c0c] rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">還款進度</span>
                    <span className="text-xs font-bold text-emerald-400">{(debtProgress * 100).toFixed(1)}% 已還</span>
                  </div>
                  <div style={{ height: 8, backgroundColor: '#1c1c1c', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${debtProgress * 100}%`, backgroundColor: debtProgress >= 0.5 ? '#10b981' : debtProgress >= 0.25 ? '#f59e0b' : '#f43f5e', borderRadius: 999, transition: 'width 0.5s ease' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>原始 {costCurSym}{fmt(originalDebt)}</span><span>剩餘 {costCurSym}{fmt(currentDebt)}</span>
                  </div>
                </div>
                <FormInput label={`當前餘額 (${costCur})`} value={debt} onChange={setDebt} type="number" prefix={costCurSym} />
              </>
            ) : asset.type === 'cash' ? (
              <>
                <CashCurrencyPicker value={cashCurrency} onChange={setCashCurrency} />
                <FormInput label={`存款金額 (${cashCurrency})`} value={cashAmt} onChange={setCashAmt} type="number" prefix={cashCurSym} />
              </>
            ) : (
              <>
                {costCur !== displayCurrency && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/8 border border-amber-500/15 rounded-xl">
                    <span className="text-amber-400 text-xs">⚠</span>
                    <p className="text-[10px] text-amber-400">此資產成本以 <strong>{costCur}</strong> 記錄</p>
                  </div>
                )}
                {asset.type === 'crypto' && <ExchangePicker value={exchange} onChange={setExchange} />}
                {asset.type === 'stock' && <MarketPicker value={market} onChange={setMarket} />}
                <FormInput label="持有數量" value={amount} onChange={setAmount} type="number" />
                <FormInput label={`買入成本 (${costCur})`} value={cost} onChange={setCost} type="number" prefix={costCurSym} />
                <FormInput label={`手動市價 (${costCur})`} value={price} onChange={setPrice} type="number" prefix={costCurSym} />
              </>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => onDelete(asset)}
                className="flex-1 bg-rose-500/10 text-rose-500 font-bold py-4 rounded-2xl text-sm hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2">
                <Trash2 size={16} /> 刪除
              </button>
              <button type="submit" className="flex-[2] bg-white text-black font-bold py-4 rounded-2xl text-sm hover:bg-gray-100 transition-all">儲存變更</button>
            </div>
          </form>
        </motion.div>
      </ModalOverlay>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RealizedPnlModal
// ═══════════════════════════════════════════════════════════════════
const RealizedPnlModal = React.memo(({ isOpen, onClose, onSave, displayCurrency }) => {
  const [rType, setRType] = useState('crypto'); const [rName, setRName] = useState('');
  const [rAmount, setRAmount] = useState(''); const [rDate, setRDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rNote, setRNote] = useState(''); const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) { setRType('crypto'); setRName(''); setRAmount(''); setRDate(new Date().toISOString().slice(0, 10)); setRNote(''); setErrors({}); }
  }, [isOpen]);

  const submit = () => {
    const e = {};
    if (!rName.trim()) e.name = '請輸入名稱';
    if (!rAmount || isNaN(rAmount)) e.amount = '請輸入金額';
    if (!rDate) e.date = '請選擇日期';
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ asset_type: rType, name: rName.trim(), amount: +rAmount, trade_date: rDate, note: rNote.trim() });
  };

  const curSym = displayCurrency === 'TWD' ? 'NT$' : '$';
  const isProfit = +rAmount >= 0;
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <ModalOverlay onClose={onClose}>
        <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          className="bg-[#141414] w-full rounded-[2rem] border border-white/8 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h3 className="font-bold text-base">新增已實現盈虧</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all"><X size={15} /></button>
          </div>
          <div className="px-5 pb-6 space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">資產種類</label>
              <div className="flex bg-[#0c0c0c] rounded-2xl p-1">
                {[{ v: 'crypto', l: '🪙 加密貨幣' }, { v: 'stock', l: '📈 股票' }].map(opt => (
                  <button key={opt.v} type="button" onClick={() => setRType(opt.v)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${rType === opt.v ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>{opt.l}</button>
                ))}
              </div>
            </div>
            <FormInput label="資產名稱 / 代號" value={rName} onChange={v => { setRName(v); setErrors(er => ({ ...er, name: '' })); }}
              placeholder={rType === 'crypto' ? 'BTC / 比特幣' : 'TSM / 台積電'} error={errors.name} />
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">已實現盈虧 <span className="text-gray-700 font-normal normal-case">（負數代表虧損）</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">{curSym}</span>
                <input type="number" step="any" placeholder="0" value={rAmount}
                  onChange={e => { setRAmount(e.target.value); setErrors(er => ({ ...er, amount: '' })); }}
                  className={['w-full bg-[#0c0c0c] rounded-2xl py-4 pl-9 pr-5 text-sm transition-all focus:outline-none focus:ring-2', errors.amount ? 'ring-2 ring-rose-500/60' : 'ring-white/5 focus:ring-indigo-500/50'].join(' ')} />
              </div>
              {errors.amount && <p className="text-rose-400 text-[10px] mt-1.5 ml-1">{errors.amount}</p>}
              {rAmount && !isNaN(rAmount) && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className={`mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold ${isProfit ? 'bg-emerald-500/8 border-emerald-500/15 text-emerald-400' : 'bg-rose-500/8 border-rose-500/15 text-rose-400'}`}>
                  {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {isProfit ? '獲利' : '虧損'} {curSym}{fmt(Math.abs(+rAmount))}
                </motion.div>
              )}
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">交易日期</label>
              <input type="date" value={rDate} onChange={e => { setRDate(e.target.value); setErrors(er => ({ ...er, date: '' })); }}
                className={['w-full bg-[#0c0c0c] rounded-2xl py-4 px-5 text-sm transition-all focus:outline-none focus:ring-2', errors.date ? 'ring-2 ring-rose-500/60' : 'ring-white/5 focus:ring-indigo-500/50'].join(' ')} />
              {errors.date && <p className="text-rose-400 text-[10px] mt-1.5 ml-1">{errors.date}</p>}
            </div>
            <FormInput label="備註（選填）" value={rNote} onChange={setRNote} placeholder="例如：以 85,000 賣出 0.1 BTC" />
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 bg-white/5 text-gray-400 font-bold py-4 rounded-2xl text-sm hover:bg-white/8 transition-all">取消</button>
              <button onClick={submit} className="flex-[2] bg-white text-black font-bold py-4 rounded-2xl text-sm hover:bg-gray-100 transition-all">儲存紀錄</button>
            </div>
          </div>
        </motion.div>
      </ModalOverlay>
    </AnimatePresence>
  );
});

// ═══════════════════════════════════════════════════════════════════
// ChartsPage — ✅ 7. 快照+配置圖同列  ✅ 9. 多線走勢圖 + toggle
// ═══════════════════════════════════════════════════════════════════
function ChartsPage({ assets, prices, snapshots, realizedPnl, displayCurrency, getVal,
  customCharts, onAddChart, onDeleteChart, onSnapshot, isSnapshotting }) {
  const curSym = displayCurrency === 'TWD' ? 'NT$' : '$';
  const [isAddChartOpen, setIsAddChartOpen] = useState(false);
  const [visibleLines, setVisibleLines] = useState(new Set(TREND_LINES.map(l => l.key)));

  const toggleLine = (key) => {
    setVisibleLines(prev => {
      if (prev.has(key) && prev.size === 1) return prev;
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const snapshotData = useMemo(() => (snapshots ?? [])
    .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    .map(s => ({
      date: s.snapshot_date.slice(0, 7),
      淨資產: s.net_worth ?? 0,
      加密貨幣: s.crypto_value ?? 0,
      股票: s.stock_value ?? 0,
      現金: s.cash_value ?? 0,
    })), [snapshots]);

  const overallPieData = useMemo(() => {
    const acc = {};
    assets.forEach(a => { if (a.type === 'liability') return; acc[a.type] = (acc[a.type] ?? 0) + getVal(a); });
    return ASSET_TYPES.filter(t => t.value !== 'liability' && (acc[t.value] ?? 0) > 0).map(t => ({ name: t.label, value: acc[t.value], color: t.color }));
  }, [assets, getVal]);

  const netWorth = useMemo(() => {
    let pos = 0, liab = 0;
    assets.forEach(a => { const v = getVal(a); if (a.type === 'liability') liab += v; else pos += v; });
    return pos - liab;
  }, [assets, getVal]);

  const roiData = useMemo(() => assets
    .filter(a => a.type !== 'liability' && a.type !== 'cash' && (a.cost_basis ?? 0) > 0)
    .map(a => {
      const costCur = (a.cost_currency ?? displayCurrency).toLowerCase();
      const livePrice = a.type === 'crypto' ? (prices[a.coin_id]?.[costCur] ?? 0) : (a.manual_price ?? 0);
      const roi = livePrice > 0 ? ((livePrice - a.cost_basis) / a.cost_basis) * 100 : null;
      return { name: a.name.length > 9 ? a.name.slice(0, 9) + '…' : a.name, ROI: roi, costCur: (a.cost_currency ?? displayCurrency) };
    }).filter(d => d.ROI !== null).sort((a, b) => b.ROI - a.ROI).slice(0, 10),
  [assets, prices, displayCurrency]);

  const pnlByMonth = useMemo(() => {
    const map = {};
    (realizedPnl ?? []).forEach(r => {
      const mo = r.trade_date?.slice(0, 7) ?? '?';
      if (!map[mo]) map[mo] = { date: mo, 加密: 0, 股票: 0 };
      if (r.asset_type === 'crypto') map[mo].加密 += r.amount; else map[mo].股票 += r.amount;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [realizedPnl]);

  const buildCustomPieData = useCallback((chartDef) => {
    let paletteIdx = 0;
    return (chartDef.asset_ids ?? []).map(id => {
      const asset = assets.find(a => a.id === id);
      if (!asset) return null;
      const isLiability = asset.type === 'liability';
      const color = isLiability ? '#f43f5e' : PALETTE[paletteIdx++ % PALETTE.length];
      return { name: asset.name, value: getVal(asset), color, isLiability };
    }).filter(Boolean).filter(d => d.value > 0);
  }, [assets, getVal]);

  const Section = ({ title, children, onDelete, action }) => (
    <div className="bg-[#111] border border-white/[0.04] rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{title}</p>
        <div className="flex items-center gap-2">
          {action}
          {onDelete && <button onClick={onDelete} className="p-1.5 rounded-full text-gray-700 hover:text-rose-400 hover:bg-rose-500/10 transition-all"><Trash2 size={13} /></button>}
        </div>
      </div>
      {children}
    </div>
  );

  const lastSnapshot = snapshotData.length > 0 ? snapshotData[snapshotData.length - 1].date : null;

  return (
    <div className="space-y-4">
      {/* ✅ 7. 快照 + 新增配置圖 同列 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSnapshot} disabled={isSnapshotting} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '11px 14px', borderRadius: '0.875rem',
          border: `1px solid ${isSnapshotting ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.4)'}`,
          color: isSnapshotting ? '#4b5563' : '#818cf8', background: '#111',
          fontSize: 12, fontWeight: 700, cursor: isSnapshotting ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
        }}>
          {isSnapshotting ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#818cf8', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> : '📸'}
          {isSnapshotting ? '記錄中…' : '立即快照'}
        </button>
        <button onClick={() => setIsAddChartOpen(true)} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '11px 14px', borderRadius: '0.875rem',
          border: '1px dashed rgba(255,255,255,0.1)', color: '#6b7280', background: '#111',
          fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
        }}>
          <PieChartIcon size={14} /> 新增配置圖
        </button>
      </div>

      <Section title="📊 資產走勢">
        {snapshotData.length < 2 ? (
          <div className="text-center py-10 text-gray-700 text-xs">
            尚無歷史資料<br />
            <span className="text-gray-800">按「立即快照」記錄當前資產，累積 2 筆後顯示走勢圖</span>
            {lastSnapshot && <div className="mt-2 text-gray-700">最新快照：{lastSnapshot}</div>}
          </div>
        ) : (
          <>
            {lastSnapshot && <p className="text-[10px] text-gray-700 mb-2 text-right">最新快照：{lastSnapshot}</p>}
            {/* ✅ 9. Toggle chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {TREND_LINES.map(line => {
                const active = visibleLines.has(line.key);
                return (
                  <button key={line.key} onClick={() => toggleLine(line.key)} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                    border: `1px solid ${active ? line.color : 'rgba(255,255,255,0.08)'}`,
                    background: active ? `${line.color}22` : 'transparent',
                    color: active ? line.color : '#4b5563', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: active ? line.color : '#374151', flexShrink: 0 }} />
                    {line.label}
                  </button>
                );
              })}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={snapshotData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  {TREND_LINES.map(line => (
                    <linearGradient key={line.key} id={`grad_${line.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={line.color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={line.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 10000).toFixed(0)}萬`} />
                <Tooltip content={<ChartTooltip prefix={curSym} />} />
                {TREND_LINES.filter(l => visibleLines.has(l.key)).map(line => (
                  <Area key={line.key} type="monotone" dataKey={line.key} name={line.label}
                    stroke={line.color} strokeWidth={2} fill={`url(#grad_${line.key})`} dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </Section>

      <Section title="🥧 整體資產配置">
        <LabeledPieChart data={overallPieData} size={300} netWorth={netWorth} curSym={curSym} centerLabel="淨資產" />
      </Section>

      <Section title="📈 各資產 ROI">
        {roiData.length === 0 ? <div className="text-center py-10 text-gray-700 text-xs">尚無可計算資產</div> : (
          <ResponsiveContainer width="100%" height={roiData.length * 36 + 20}>
            <BarChart data={roiData} layout="vertical" margin={{ top: 0, right: 14, left: 0, bottom: 0 }} barSize={10}>
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(0)}%`} domain={['dataMin - 5', 'dataMax + 5']} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} width={75} />
              <Tooltip formatter={(v, n, props) => [`${v.toFixed(2)}% (${props?.payload?.costCur ?? ''})`, 'ROI']}
                contentStyle={{ background: '#fff', border: 'none', borderRadius: '0.75rem', fontSize: 12, color: '#111', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }} itemStyle={{ color: '#111', fontWeight: 700 }} />
              <ReferenceLine x={0} stroke="#333" />
              <Bar dataKey="ROI" radius={[0, 6, 6, 0]}>{roiData.map((entry, i) => <Cell key={i} fill={entry.ROI >= 0 ? '#10b981' : '#f43f5e'} fillOpacity={0.85} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      <Section title="💰 月已實現盈虧">
        {pnlByMonth.length === 0 ? <div className="text-center py-10 text-gray-700 text-xs">尚無已實現盈虧記錄</div> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={pnlByMonth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip prefix={curSym} />} />
              <Bar dataKey="加密" fill="#6366f1" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
              <Bar dataKey="股票" fill="#3b82f6" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {(customCharts ?? []).map(chart => {
        const pieData = buildCustomPieData(chart);
        const hasLiability = pieData.some(d => d.isLiability);
        const totalLiab = pieData.filter(d => d.isLiability).reduce((s, d) => s + d.value, 0);
        const total = pieData.reduce((s, d) => s + d.value, 0);
        return (
          <Section key={chart.id} title={`✦ ${chart.title}`} onDelete={() => onDeleteChart(chart.id)}>
            {hasLiability && (
              <div className="flex items-center justify-between mb-3 px-3 py-2 bg-rose-500/8 border border-rose-500/15 rounded-xl">
                <span className="text-[10px] text-rose-400">⚠ 含負債項目（紅色）</span>
                <span className="text-[10px] text-rose-400 font-bold">負債比 {total > 0 ? ((totalLiab / total) * 100).toFixed(1) : 0}%</span>
              </div>
            )}
            <LabeledPieChart data={pieData} size={300} netWorth={total} curSym={curSym} centerLabel={hasLiability ? '總計（含負債）' : '總價值'} />
          </Section>
        );
      })}

      {isAddChartOpen && (
        <AddChartModal isOpen onClose={() => setIsAddChartOpen(false)}
          onSave={(def) => { onAddChart(def); setIsAddChartOpen(false); }}
          assets={assets} getVal={getVal} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PnlPage — ✅ 8. 緊湊總覽 + 綠紅上色
// ═══════════════════════════════════════════════════════════════════
function PnlPage({ realizedPnl, onDelete, displayCurrency, onAddNew }) {
  const curSym = displayCurrency === 'TWD' ? 'NT$' : '$';
  const totalCrypto = realizedPnl.filter(r => r.asset_type === 'crypto').reduce((s, r) => s + r.amount, 0);
  const totalStock  = realizedPnl.filter(r => r.asset_type === 'stock').reduce((s, r) => s + r.amount, 0);
  const total = totalCrypto + totalStock;
  const isOverallGain = total >= 0;

  return (
    <div className="space-y-5">
      {/* ✅ 8. 緊湊版總覽 */}
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '1.5rem', padding: '16px' }}>
        <p style={{ fontSize: 10, fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>已實現損益總覽</p>
        {/* 累計損益 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '0.625rem', flexShrink: 0, backgroundColor: isOverallGain ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isOverallGain ? <TrendingUp size={16} style={{ color: '#10b981' }} /> : <TrendingDown size={16} style={{ color: '#f43f5e' }} />}
            </div>
            <span style={{ fontSize: 11, color: '#6b7280' }}>累計損益</span>
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: isOverallGain ? '#10b981' : '#f43f5e', fontVariantNumeric: 'tabular-nums' }}>
            {isOverallGain ? '+' : ''}{curSym}{fmt(total)}
          </span>
        </div>
        {/* 加密 / 股票 同列 */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: '🪙 加密', value: totalCrypto }, { label: '📈 股票', value: totalStock }].map((item, i) => (
            <div key={i} style={{ flex: 1, background: '#0c0c0c', borderRadius: '0.875rem', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#4b5563' }}>{item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: item.value >= 0 ? '#10b981' : '#f43f5e' }}>
                {item.value >= 0 ? '+' : ''}{curSym}{fmt(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onAddNew} className="w-full flex items-center justify-center gap-2.5 bg-white text-black py-4 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all active:scale-[0.98]">
        <Plus size={17} strokeWidth={2.5} /> 新增已實現盈虧
      </button>

      {realizedPnl.length === 0 ? (
        <div className="text-center py-20 text-gray-700">
          <p className="text-5xl mb-4">📝</p><p className="text-sm">尚無記錄</p>
          <p className="text-xs mt-1 text-gray-800">點擊上方按鈕新增第一筆盈虧</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(() => {
            const sorted = [...realizedPnl].sort((a, b) => b.trade_date?.localeCompare(a.trade_date));
            const byMonth = {};
            sorted.forEach(r => { const mo = r.trade_date?.slice(0, 7) ?? '未知'; if (!byMonth[mo]) byMonth[mo] = []; byMonth[mo].push(r); });
            return Object.entries(byMonth).map(([month, records]) => {
              const monthTotal = records.reduce((s, r) => s + r.amount, 0);
              return (
                <div key={month}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-bold text-gray-600">{month}</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                    <span style={{ color: monthTotal >= 0 ? '#10b981' : '#f43f5e' }} className="text-[10px] font-bold tabular-nums">
                      {monthTotal >= 0 ? '+' : ''}{curSym}{fmt(monthTotal)}
                    </span>
                  </div>
                  {/* ✅ 6. 2欄 inline style */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {records.map((r, idx) => {
                      const isGain = r.amount >= 0;
                      const cfg = getTypeCfg(r.asset_type);
                      const amountColor = isGain ? '#10b981' : '#f43f5e';
                      return (
                        <motion.div key={r.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.03 }}
                          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '12px', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: cfg.color, display: 'inline-block' }} />
                            <span style={{ fontSize: 10, color: amountColor }}>{isGain ? '▲' : '▼'}</span>
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{r.name}</p>
                          <p style={{ fontSize: 10, color: '#4b5563', marginBottom: 6, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{r.trade_date} · {cfg.label}</p>
                          {r.note && <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.note}</p>}
                          <div style={{ flex: 1 }} />
                          <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', margin: '6px 0' }} />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: amountColor, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                              {isGain ? '+' : ''}{curSym}{fmt(r.amount)}
                            </p>
                            <button onClick={() => onDelete(r)} style={{ flexShrink: 0, padding: 4, borderRadius: '50%', background: 'none', border: 'none', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#f43f5e'} onMouseLeave={e => e.currentTarget.style.color = '#374151'}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 主 App
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [prices, setPrices] = useState({});
  const [exchangeRates, setExchangeRates] = useState({});
  const [exchangeRateUpdatedAt, setExchangeRateUpdatedAt] = useState(null);
  const [rateAgoText, setRateAgoText] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [realizedPnl, setRealizedPnl] = useState([]);
  const [customCharts, setCustomCharts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState('TWD');
  const [activePage, setActivePage] = useState('home');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('value_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [isPnlOpen, setIsPnlOpen] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  const curSym = displayCurrency === 'TWD' ? 'NT$' : '$';

  const fetchExchangeRates = useCallback(async () => {
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/TWD');
      const data = await res.json();
      setExchangeRates(data.rates ?? {}); setExchangeRateUpdatedAt(Date.now());
    } catch {
      setExchangeRates({ TWD: 1, USD: 0.031, HKD: 0.24, JPY: 4.6, EUR: 0.029, GBP: 0.025, SGD: 0.042, CNY: 0.22 });
      setExchangeRateUpdatedAt(Date.now());
    }
  }, []);

  useEffect(() => {
    const update = () => {
      if (!exchangeRateUpdatedAt) { setRateAgoText(''); return; }
      const mins = Math.floor((Date.now() - exchangeRateUpdatedAt) / 60000);
      setRateAgoText(mins === 0 ? '剛剛' : `${mins} 分鐘前`);
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [exchangeRateUpdatedAt]);

  const convertToDisplay = useCallback((amount, fromCurrency) => {
    if (!fromCurrency || fromCurrency === 'TWD') {
      if (displayCurrency === 'TWD') return amount;
      return amount * (exchangeRates[displayCurrency] ?? 1);
    }
    if (fromCurrency === displayCurrency) return amount;
    const toTWD = 1 / (exchangeRates[fromCurrency] ?? 1);
    const fromTWD = displayCurrency === 'TWD' ? 1 : (exchangeRates[displayCurrency] ?? 1);
    return amount * toTWD * fromTWD;
  }, [displayCurrency, exchangeRates]);

  // ✅ 2. 匯率 + 更新時間同一列
  const rateDisplayStr = useMemo(() => {
    if (!exchangeRates || Object.keys(exchangeRates).length === 0) return '';
    const rate = exchangeRates['USD'] ? (1 / exchangeRates['USD']) : null;
    if (!rate) return '';
    return rateAgoText ? `1 USD = NT$${rate.toFixed(1)}  ·  ${rateAgoText}` : `1 USD = NT$${rate.toFixed(1)}`;
  }, [exchangeRates, rateAgoText]);

  const fetchPrices = useCallback(async (list, currency) => {
    const cryptoAssets = list.filter(a => a.type === 'crypto');
    if (!cryptoAssets.length) return;
    const costCurrencies = [...new Set(cryptoAssets.map(a => a.cost_currency ?? currency).map(c => c.toLowerCase()))];
    const allCurrencies = [...new Set([...costCurrencies, currency.toLowerCase()])];
    const ids = cryptoAssets.map(a => a.coin_id).join(',');
    setIsRefreshing(true);
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${allCurrencies.join(',')}&include_24hr_change=true`);
      const data = await res.json(); setPrices(data);
    } finally { setIsRefreshing(false); }
  }, []);

  const fetchAll = useCallback(async () => {
    const [{ data: a }, { data: s }, { data: p }, { data: c }] = await Promise.all([
      supabase.from('assets').select('*'),
      supabase.from('asset_snapshots').select('*').order('snapshot_date'),
      supabase.from('realized_pnl').select('*').order('trade_date', { ascending: false }),
      supabase.from('custom_charts').select('*').order('created_at'),
    ]);
    if (a) { setAssets(a); fetchPrices(a, displayCurrency); }
    if (s) setSnapshots(s); if (p) setRealizedPnl(p); if (c) setCustomCharts(c);
  }, [displayCurrency, fetchPrices]);

  const refreshAssets = useCallback(async () => {
    const { data: a } = await supabase.from('assets').select('*');
    if (a) { setAssets(a); fetchPrices(a, displayCurrency); }
  }, [displayCurrency, fetchPrices]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) { fetchAll(); fetchExchangeRates(); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null; setUser(u);
      if (u) { fetchAll(); fetchExchangeRates(); }
      else { setAssets([]); setPrices({}); setSnapshots([]); setRealizedPnl([]); setCustomCharts([]); }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (assets.length > 0) fetchPrices(assets, displayCurrency);
  }, [displayCurrency, fetchPrices]); // eslint-disable-line

  const getVal = useCallback((a) => {
    if (a.type === 'crypto') return a.amount * (prices[a.coin_id]?.[displayCurrency.toLowerCase()] ?? 0);
    if (a.type === 'cash') {
      const cashCur = a.cash_currency ?? a.cost_currency ?? 'TWD';
      return convertToDisplay(a.amount, cashCur);
    }
    if (a.type === 'liability') return a.manual_price ?? 0;
    const stockCostCur = a.cost_currency ?? displayCurrency;
    return a.amount * convertToDisplay(a.manual_price ?? 0, stockCostCur);
  }, [prices, displayCurrency, convertToDisplay]);

  const getRoi = useCallback((asset) => {
    if (asset.type === 'liability' || asset.type === 'cash') return null;
    if (!asset.cost_basis || asset.cost_basis === 0) return null;
    const costCur = (asset.cost_currency ?? displayCurrency).toLowerCase();
    const livePrice = asset.type === 'crypto' ? (prices[asset.coin_id]?.[costCur] ?? 0) : (asset.manual_price ?? 0);
    if (livePrice === 0) return null;
    return ((livePrice - asset.cost_basis) / asset.cost_basis) * 100;
  }, [prices, displayCurrency]);

  const stats = useMemo(() => {
    let s = { crypto: 0, stock: 0, cash: 0, liability: 0, invested: 0 };
    assets.forEach(a => {
      const v = getVal(a);
      if (a.type === 'liability') { s.liability += v; return; }
      s[a.type] = (s[a.type] ?? 0) + v;
      if (a.type === 'cash') { s.invested += v; }
      else { const costCur = a.cost_currency ?? displayCurrency; s.invested += a.amount * convertToDisplay(a.cost_basis ?? 0, costCur); }
    });
    const pos = s.crypto + s.stock + s.cash;
    const net = pos - s.liability;
    const profit = net - s.invested + s.liability;
    const roi = s.invested > 0 ? (profit / s.invested) * 100 : 0;
    return { ...s, pos, net, profit, roi };
  }, [assets, getVal, displayCurrency, convertToDisplay]);

  const donutSegs = useMemo(() => [
    { label: 'crypto', pct: stats.pos > 0 ? (stats.crypto / stats.pos) * 100 : 0, color: '#FFA500' },
    { label: 'stock',  pct: stats.pos > 0 ? (stats.stock  / stats.pos) * 100 : 0, color: '#3b82f6' },
    { label: 'cash',   pct: stats.pos > 0 ? (stats.cash   / stats.pos) * 100 : 0, color: '#10b981' },
  ].filter(s => s.pct > 0.3), [stats]);

  const handleManualSnapshot = useCallback(async () => {
    if (!user || !assets.length) return;
    setIsSnapshotting(true);
    const today = new Date().toISOString().slice(0, 10);
    const snap = { crypto: 0, stock: 0, cash: 0, liability: 0 };
    assets.forEach(a => { const v = getVal(a); if (a.type === 'liability') snap.liability += v; else snap[a.type] = (snap[a.type] ?? 0) + v; });
    const netWorth = snap.crypto + snap.stock + snap.cash - snap.liability;
    const { error } = await supabase.from('asset_snapshots').upsert([{
      user_id: user.id, snapshot_date: today, net_worth: netWorth,
      crypto_value: snap.crypto, stock_value: snap.stock, cash_value: snap.cash, liability_value: snap.liability,
    }], { onConflict: 'user_id,snapshot_date' });
    setIsSnapshotting(false);
    if (!error) { await fetchAll(); alert(`✅ 快照完成！\n日期：${today}\n淨資產：${curSym}${fmt(netWorth)}`); }
    else alert('快照失敗，請稍後再試');
  }, [user, assets, getVal, fetchAll, curSym]);

  const handleSaveCrypto = async ({ coin, amount, cost_basis, exchange, cost_currency }) => {
    await supabase.from('assets').insert([{ user_id: user.id, name: coin.name, symbol: coin.symbol.toUpperCase(), coin_id: coin.id, amount, cost_basis, type: 'crypto', exchange: exchange || null, cost_currency: cost_currency ?? displayCurrency }]);
    setIsAddOpen(false); refreshAssets();
  };
  const handleSaveManual = async (data) => {
    await supabase.from('assets').insert([{ user_id: user.id, ...data }]);
    setIsAddOpen(false); refreshAssets();
  };
  const handleUpdate = async (id, updates) => {
    await supabase.from('assets').update(updates).eq('id', id);
    setIsEditOpen(false); refreshAssets();
  };
  const handleDelete = async (asset) => {
    if (!confirm(`確定刪除「${asset.name}」？`)) return;
    await supabase.from('assets').delete().eq('id', asset.id);
    setIsEditOpen(false); refreshAssets();
  };
  const handleSavePnl = async (data) => {
    await supabase.from('realized_pnl').insert([{ user_id: user.id, ...data }]);
    setIsPnlOpen(false);
    const { data: p } = await supabase.from('realized_pnl').select('*').order('trade_date', { ascending: false });
    if (p) setRealizedPnl(p);
  };
  const handleDeletePnl = async (r) => {
    if (!confirm('確定刪除這筆記錄？')) return;
    await supabase.from('realized_pnl').delete().eq('id', r.id);
    const { data: p } = await supabase.from('realized_pnl').select('*').order('trade_date', { ascending: false });
    if (p) setRealizedPnl(p);
  };
  const handleAddChart = async (def) => {
    await supabase.from('custom_charts').insert([{ user_id: user.id, title: def.title, asset_ids: def.asset_ids }]);
    const { data: c } = await supabase.from('custom_charts').select('*').order('created_at');
    if (c) setCustomCharts(c);
  };
  const handleDeleteChart = async (id) => {
    if (!confirm('確定刪除此配置圖？')) return;
    await supabase.from('custom_charts').delete().eq('id', id);
    const { data: c } = await supabase.from('custom_charts').select('*').order('created_at');
    if (c) setCustomCharts(c);
  };

  const handleExportCSV = useCallback(() => {
    const header = ['名稱', '代號', '類型', '數量', '買入成本', '成本幣別', `現值(${displayCurrency})`, 'ROI(%)', '交易所/市場'];
    const rows = assets.map(a => {
      const val = getVal(a); const roi = getRoi(a);
      return [a.name, a.symbol, getTypeCfg(a.type).label, a.amount, a.cost_basis, a.cost_currency ?? displayCurrency, val.toFixed(2), roi !== null ? roi.toFixed(2) : 'N/A', a.exchange ?? a.market ?? ''];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [assets, getVal, getRoi, displayCurrency]);

  const filteredAndSortedAssets = useMemo(() => {
    let list = activeTab === 'all' ? assets : assets.filter(a => a.type === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'value_desc') return getVal(b) - getVal(a);
      if (sortBy === 'value_asc')  return getVal(a) - getVal(b);
      if (sortBy === 'roi_desc') { const ra = getRoi(a) ?? -Infinity; const rb = getRoi(b) ?? -Infinity; return rb - ra; }
      if (sortBy === 'roi_asc')  { const ra = getRoi(a) ?? Infinity;  const rb = getRoi(b) ?? Infinity;  return ra - rb; }
      if (sortBy === 'name_asc')  return a.name.localeCompare(b.name);
      return 0;
    });
  }, [assets, activeTab, searchQuery, sortBy, getVal, getRoi]);

  const grouped = ASSET_TYPES.map(t => ({ ...t, items: filteredAndSortedAssets.filter(a => a.type === t.value) })).filter(g => g.items.length > 0);

  // ─── 登入頁 ───
  if (!user) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm flex flex-col items-center">
        <p className="text-indigo-500 font-black tracking-[0.3em] text-lg mb-2">PORTFOLIO</p>
        <p className="text-gray-700 text-xs tracking-widest mb-12">個人資產追蹤</p>
        <div className="w-full bg-[#111] border border-white/[0.06] rounded-[2rem] p-8 flex flex-col items-center gap-5">
          <div className="text-center">
            <p className="font-bold text-lg mb-1">歡迎回來</p>
            <p className="text-gray-600 text-xs">請登入以存取你的投資組合</p>
          </div>
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-2xl text-sm hover:bg-gray-100 transition-all active:scale-[0.98]">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            使用 Google 帳號登入
          </button>
        </div>
        <p className="text-gray-800 text-[10px] mt-8 text-center">你的資料安全儲存於 Supabase</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30">

      {/* ✅ 1. 第一列 — 隨頁滾動，safe-area-inset */}
      <div className="max-w-xl mx-auto px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex bg-[#181818] rounded-full p-1 border border-white/5">
            {['TWD', 'USD'].map(c => (
              <button key={c} onClick={() => setDisplayCurrency(c)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${displayCurrency === c ? 'bg-white text-black' : 'text-gray-500 hover:text-gray-300'}`}>
                {c}
              </button>
            ))}
          </div>

          {/* ✅ 2. 匯率 + 時間同一列 */}
          {rateDisplayStr && (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-600 truncate">{rateDisplayStr}</p>
            </div>
          )}

          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={handleExportCSV} title="匯出 CSV"
              className="p-2.5 rounded-full text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all">
              <Download size={17} />
            </button>
            <button onClick={() => { fetchAll(); fetchExchangeRates(); }}
              className={`p-2.5 rounded-full text-gray-500 hover:text-white hover:bg-white/5 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
              <RefreshCw size={17} />
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); }}
              className="p-2.5 rounded-full text-gray-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* ✅ 3. Tab 列 sticky */}
      <div className="sticky top-0 z-50 max-w-xl mx-auto px-5"
        style={{ background: 'linear-gradient(to bottom, #050505 80%, transparent)', paddingBottom: 8 }}>
        <div className="flex bg-[#141414] border border-white/8 rounded-[1.25rem] p-1">
          {[
            { id: 'home',   icon: LayoutDashboard, label: '總覽' },
            { id: 'charts', icon: BarChart2,        label: '圖表' },
            { id: 'pnl',    icon: DollarSign,       label: '盈虧' },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activePage === tab.id;
            return (
              <button key={tab.id} onClick={() => setActivePage(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all
                  ${active ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                <Icon size={14} strokeWidth={active ? 2.5 : 2} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-xl mx-auto px-5 pb-12">
        {activePage === 'home' && (
          <>
            <section className="py-4 flex flex-col items-center">
              <div className="relative mb-4">
                <DonutChart segments={donutSegs} size={210} strokeWidth={30}
                  net={stats.net} curSym={curSym} roi={stats.roi} profit={stats.profit} stats={stats} />
              </div>

              {/* ✅ 4. 類別佔比 — 水平單列卡片 */}
              <div style={{ display: 'flex', gap: 6, width: '100%', overflowX: 'auto', paddingBottom: 2 }}>
                {[
                  { type: 'crypto',    label: '加密', value: stats.crypto,    color: '#FFA500' },
                  { type: 'stock',     label: '股票', value: stats.stock,     color: '#3b82f6' },
                  { type: 'cash',      label: '現金', value: stats.cash,      color: '#10b981' },
                  { type: 'liability', label: '負債', value: stats.liability, color: '#f43f5e', negative: true },
                ].map(item => {
                  const pct = stats.pos > 0 && item.type !== 'liability'
                    ? ((stats[item.type] / stats.pos) * 100).toFixed(0) + '%' : null;
                  const isActive = activeTab === item.type;
                  return (
                    <button key={item.type} onClick={() => setActiveTab(t => t === item.type ? 'all' : item.type)}
                      style={{
                        flex: '1 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                        padding: '10px 12px', borderRadius: '0.875rem',
                        border: `1px solid ${isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)'}`,
                        background: isActive ? 'rgba(255,255,255,0.05)' : '#111',
                        cursor: 'pointer', transition: 'all 0.15s', minWidth: 0,
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'nowrap' }}>{item.label}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: item.color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {item.negative ? '-' : ''}{curSym}{fmt(item.value)}
                      </span>
                      {pct && <span style={{ fontSize: 9, color: '#4b5563', marginTop: 2 }}>{pct}</span>}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ✅ 5. 投資概覽 — 緊湊版 */}
            <div style={{ marginBottom: 20, background: '#111', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '1.5rem', padding: '16px' }}>
              <p style={{ fontSize: 10, fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>投資概覽</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {/* 左：投入 + 目前 */}
                <div style={{ flex: 2, background: '#0c0c0c', borderRadius: '0.875rem', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: '#4b5563' }}>投入</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>{curSym}{fmt(stats.invested)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: '#4b5563' }}>目前</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{curSym}{fmt(stats.pos)}</span>
                  </div>
                </div>
                {/* 右：報酬 */}
                <div style={{
                  flex: 1, background: stats.profit >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
                  border: `1px solid ${stats.profit >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}`,
                  borderRadius: '0.875rem', padding: '10px 12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 9, color: '#6b7280', marginBottom: 4 }}>報酬</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: stats.profit >= 0 ? '#10b981' : '#f43f5e', fontVariantNumeric: 'tabular-nums' }}>
                    {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: 10, color: stats.profit >= 0 ? '#10b981' : '#f43f5e', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                    {stats.profit >= 0 ? '+' : ''}{curSym}{fmt(Math.abs(stats.profit))}
                  </span>
                </div>
              </div>
              {/* 進度條 */}
              {stats.invested > 0 && (() => {
                const pct = Math.min(Math.min(stats.pos / stats.invested, 2) * 50, 100);
                return (
                  <div style={{ height: 6, backgroundColor: '#1c1c1c', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: stats.pos >= stats.invested ? '#10b981' : '#f43f5e', borderRadius: 999, transition: 'width 0.8s ease' }} />
                  </div>
                );
              })()}
            </div>

            <button onClick={() => setIsAddOpen(true)}
              className="w-full flex items-center justify-center gap-2.5 bg-white text-black py-4 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all active:scale-[0.98] mb-5">
              <Plus size={17} strokeWidth={2.5} /> 新增資產
            </button>

            {/* Tab 篩選 */}
            <div className="flex gap-2 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {[{ value: 'all', label: '全部', emoji: '🗂' }, ...ASSET_TYPES].map(t => {
                const cnt = t.value === 'all' ? assets.length : assets.filter(a => a.type === t.value).length;
                if (cnt === 0 && t.value !== 'all') return null;
                return (
                  <button key={t.value} onClick={() => setActiveTab(t.value)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all
                      ${activeTab === t.value ? 'bg-white text-black' : 'bg-[#181818] text-gray-500 hover:text-white border border-white/5'}`}>
                    <span>{t.emoji}</span><span>{t.label}</span>
                    <span className={activeTab === t.value ? 'text-black/40' : 'text-gray-700'}>{cnt}</span>
                  </button>
                );
              })}
            </div>

            {/* 搜尋 + 排序 */}
            <div className="flex gap-2 mb-5">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜尋資產名稱或代號…"
                  className="w-full bg-[#111] border border-white/[0.06] rounded-2xl py-2.5 pl-9 pr-4 text-xs text-gray-300 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all" />
              </div>
              <div className="relative">
                <button onClick={() => setShowSortMenu(v => !v)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#111] border border-white/[0.06] rounded-2xl text-xs text-gray-500 hover:text-white transition-all">
                  <ArrowUpDown size={13} />
                </button>
                <AnimatePresence>
                  {showSortMenu && (
                    <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      className="absolute right-0 top-full mt-1.5 bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden z-50 min-w-[160px] shadow-2xl">
                      {SORT_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-xs font-semibold transition-all hover:bg-white/5 ${sortBy === opt.value ? 'text-white bg-white/4' : 'text-gray-500'}`}>
                          {opt.label}
                          {sortBy === opt.value && <Check size={11} className="text-indigo-400" strokeWidth={3} />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ✅ 6. 資產卡片 — 2欄 inline style grid */}
            <AnimatePresence mode="wait">
              <motion.div key={activeTab + searchQuery} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }} className="space-y-6">
                {grouped.map(group => (
                  <div key={group.value}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm">{group.emoji}</span>
                      <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${group.text}`}>{group.label}</h4>
                      <div className="flex-1 h-px bg-white/[0.04]" />
                      <span className="text-[10px] text-gray-700">{group.items.length} 筆</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {group.items.map(asset => {
                        const val = getVal(asset);
                        const cfg = getTypeCfg(asset.type);
                        const roi = getRoi(asset);
                        const costCur = asset.cost_currency ?? displayCurrency;
                        const costCurSym = costCur === 'TWD' ? 'NT$' : '$';
                        const isLiability = asset.type === 'liability';
                        const isCash = asset.type === 'cash';
                        const isStock = asset.type === 'stock';
                        const isCrypto = asset.type === 'crypto';
                        const change24h = isCrypto ? (prices[asset.coin_id]?.[`${displayCurrency.toLowerCase()}_24h_change`] ?? null) : null;
                        const livePriceDisplay = isCrypto ? (prices[asset.coin_id]?.[costCur.toLowerCase()] ?? null) : isStock ? (asset.manual_price ?? null) : null;
                        const cashCur = asset.cash_currency ?? asset.cost_currency ?? 'TWD';
                        const titleLine = isCrypto ? `${asset.symbol}${asset.exchange ? ' · ' + asset.exchange : ''}`
                          : isStock ? `${asset.symbol} ${asset.name}${asset.market === 'TW' ? ' · 🇹🇼' : asset.market === 'US' ? ' · 🇺🇸' : ''}`
                          : isCash ? `${asset.name} · ${cashCur}` : asset.name;
                        const amountLine = isCrypto ? `${asset.amount} 顆` : isStock ? `${asset.amount} 股` : null;
                        const origDebt = asset.cost_basis ?? 0;
                        const curDebt = asset.manual_price ?? 0;
                        const debtProg = origDebt > 0 ? Math.max(0, Math.min(1, 1 - curDebt / origDebt)) : 0;
                        const debtBarColor = debtProg >= 0.5 ? '#10b981' : debtProg >= 0.25 ? '#f59e0b' : '#f43f5e';
                        const roiColor = roi !== null ? (roi >= 0 ? '#10b981' : '#f43f5e') : '#9ca3af';

                        return (
                          <motion.button key={asset.id}
                            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.96 }}
                            onClick={() => { setEditingAsset(asset); setIsEditOpen(true); }}
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', width: '100%', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: cfg.color, display: 'inline-block', flexShrink: 0 }} />
                              {roi !== null && <span style={{ color: roiColor, fontSize: 10, fontWeight: 900 }}>{roi >= 0 ? '+' : ''}{roi.toFixed(1)}%</span>}
                            </div>
                            <p style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%' }}>{titleLine}</p>
                            {amountLine && <p style={{ fontSize: 10, color: '#4b5563', marginBottom: 8, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{amountLine}</p>}
                            {isCash && <div style={{ flex: 1 }} />}
                            {isLiability && (
                              <div style={{ marginTop: 4, marginBottom: 8, width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ fontSize: 9, color: '#4b5563' }}>已還 {(debtProg * 100).toFixed(0)}%</span>
                                  <span style={{ fontSize: 9, color: '#4b5563' }}>{costCurSym}{fmt(curDebt)}</span>
                                </div>
                                <div style={{ height: 4, backgroundColor: '#1c1c1c', borderRadius: 999, overflow: 'hidden', width: '100%' }}>
                                  <div style={{ height: '100%', width: `${debtProg * 100}%`, backgroundColor: debtBarColor, borderRadius: 999, transition: 'width 0.5s ease' }} />
                                </div>
                              </div>
                            )}
                            {!isLiability && !isCash && (
                              <div style={{ marginTop: 4, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {(asset.cost_basis ?? 0) > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 9, color: '#374151' }}>買</span>
                                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{costCurSym}{fmt(asset.cost_basis, 2)}</span>
                                  </div>
                                )}
                                {livePriceDisplay !== null && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: 9, color: '#374151', flexShrink: 0 }}>現</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                                      <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{costCurSym}{fmt(livePriceDisplay, 2)}</span>
                                      {change24h !== null && <span style={{ fontSize: 9, fontWeight: 700, color: change24h >= 0 ? '#10b981' : '#f43f5e', flexShrink: 0 }}>{change24h >= 0 ? '▲' : '▼'}{Math.abs(change24h).toFixed(1)}%</span>}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 8 }} />
                            <p style={{ fontSize: 13, fontWeight: 700, color: isLiability ? '#f43f5e' : '#fff', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                              {isLiability ? '-' : ''}{curSym}{fmt(val)}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {filteredAndSortedAssets.length === 0 && (
                  <div className="text-center py-20 text-gray-700">
                    {searchQuery ? (<><p className="text-4xl mb-4">🔍</p><p className="text-sm">找不到「{searchQuery}」</p></>) : (<><p className="text-5xl mb-4">📭</p><p className="text-sm">尚無資產</p><p className="text-xs mt-1 text-gray-800">點擊「新增資產」開始追蹤</p></>)}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}

        {activePage === 'charts' && (
          <div className="pt-4">
            <ChartsPage assets={assets} prices={prices} snapshots={snapshots}
              realizedPnl={realizedPnl} displayCurrency={displayCurrency} getVal={getVal}
              customCharts={customCharts} onAddChart={handleAddChart} onDeleteChart={handleDeleteChart}
              onSnapshot={handleManualSnapshot} isSnapshotting={isSnapshotting} />
          </div>
        )}

        {activePage === 'pnl' && (
          <div className="pt-4">
            <PnlPage realizedPnl={realizedPnl} onDelete={handleDeletePnl}
              displayCurrency={displayCurrency} onAddNew={() => setIsPnlOpen(true)} />
          </div>
        )}
      </main>

      {isAddOpen && <AddAssetModal isOpen onClose={() => setIsAddOpen(false)} onSaveCrypto={handleSaveCrypto} onSaveManual={handleSaveManual} displayCurrency={displayCurrency} />}
      {isEditOpen && editingAsset && <EditModal asset={editingAsset} isOpen onClose={() => setIsEditOpen(false)} onUpdate={handleUpdate} onDelete={handleDelete} displayCurrency={displayCurrency} />}
      {isPnlOpen && <RealizedPnlModal isOpen onClose={() => setIsPnlOpen(false)} onSave={handleSavePnl} displayCurrency={displayCurrency} />}
      {showSortMenu && <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />}
    </div>
  );
}