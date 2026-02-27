import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus, LogOut, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [totalNetWorth, setTotalNetWorth] = useState(0);

  // 1. 監聽 Google 登入狀態
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. 即時報價抓取 (整合台股 .TW、美股、加密貨幣)
  const fetchLivePrice = async (symbol, type) => {
    if (type === 'cash') return 1;
    try {
      // 使用 AllOrigins 繞過 CORS 限制抓取 Yahoo Finance
      const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();
      const json = JSON.parse(data.contents);
      return json.chart.result[0].meta.regularMarketPrice || 0;
    } catch (e) {
      console.error(`無法獲取 ${symbol} 報價`, e);
      return 0;
    }
  };

  // 3. 從 Supabase 讀取並同步數據
  const refreshData = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('amount', { ascending: false });

    if (data) {
      let netSum = 0;
      const updated = await Promise.all(data.map(async (item) => {
        const price = await fetchLivePrice(item.symbol, item.type);
        const value = price * item.amount;
        netSum += (item.type === 'liability' ? -Math.abs(value) : value);
        return { ...item, currentPrice: price, totalValue: value };
      }));
      setAssets(updated);
      setTotalNetWorth(netSum);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) refreshData();
  }, [user]);

  const handleLogin = () => supabase.auth.signInWithOAuth({ 
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  
  const handleLogout = () => supabase.auth.signOut();

  // 登入前畫面
  if (!user && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(255,255,255,0.2)]">
          <TrendingUp size={40} className="text-black" />
        </div>
        <h1 className="text-4xl font-black mb-2 tracking-tighter">WEALTH</h1>
        <p className="text-gray-500 mb-12 text-center font-medium">極簡資產管理，台美股即時同步</p>
        <button 
          onClick={handleLogin}
          className="w-full max-w-xs py-4 bg-white text-black rounded-2xl font-bold text-lg transition-transform active:scale-95"
        >
          使用 Google 登入
        </button>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  // 主畫面
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-32 pt-16 px-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h2 className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] mb-1">Net Worth</h2>
          <p className="text-5xl font-light tracking-tight">
            <span className="text-2xl mr-1 text-gray-500">$</span>
            {totalNetWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <button onClick={handleLogout} className="p-3 bg-[#1a1a1a] rounded-full text-gray-400 active:bg-gray-800">
          <LogOut size={18} />
        </button>
      </div>

      {/* 圖表區 */}
      <div className="h-72 w-full mb-12 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              data={assets} 
              dataKey="totalValue" 
              innerRadius={85} 
              outerRadius={110} 
              paddingAngle={8}
              stroke="none"
            >
              {assets.map((entry, index) => (
                <Cell key={index} fill={entry.type === 'liability' ? '#ff4d4d' : ['#fff', '#888', '#444', '#222'][index % 4]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <Wallet size={24} className="text-gray-600 mb-1" />
          <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">{assets.length} Assets</span>
        </div>
      </div>

      {/* 資產列表 */}
      <div className="space-y-4">
        <h3 className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-4">Portfolio BreakDown</h3>
        {assets.map((asset) => (
          <div key={asset.id} className="bg-[#151515] p-5 rounded-3xl flex justify-between items-center transition-all active:bg-[#1f1f1f]">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${asset.type === 'liability' ? 'bg-red-950/30 text-red-500' : 'bg-white/5 text-gray-300'}`}>
                {asset.type === 'liability' ? <ArrowDownRight size={20}/> : <ArrowUpRight size={20}/>}
              </div>
              <div>
                <p className="font-bold text-base">{asset.name}</p>
                <p className="text-[10px] text-gray-500 font-mono uppercase">
                  {asset.amount} {asset.symbol.replace('.TW', '')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">
                <span className="text-xs text-gray-600 mr-1">$</span>
                {asset.totalValue?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">
                {asset.type}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 懸浮按鈕 */}
      <div className="fixed bottom-10 left-0 right-0 flex justify-center px-6">
        <button 
          className="w-full max-w-md py-4 bg-white text-black rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95 transition-transform"
          onClick={() => alert("功能開發中：請至 Supabase Table Editor 手動新增資料")}
        >
          <Plus size={20} /> ADD ASSET
        </button>
      </div>
    </div>
  );
}