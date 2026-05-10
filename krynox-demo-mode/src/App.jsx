import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { 
  Shield, 
  Cpu, 
  Activity, 
  Terminal, 
  Wallet, 
  ExternalLink, 
  Trash2, 
  RefreshCcw,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Zap,
  Download
} from 'lucide-react';
import demoData from './demoData.json';

const WALLET_ADDRESS = '7YhgrEbVK9ZuAGHyy24BMB6M9h2MrYYDL94eKeSaS1Uu'; 

export default function App() {
  const [threats, setThreats] = useState(demoData);
  const [solBalance] = useState(7.4999753201);
  const [networkStats] = useState({ 
    tps: 2481, 
    blockhash: '9RC6XNtsh5HZD977vpD6kNDVYfX7kSRCqkzPMjVZEHnn' 
  });
  const [systemStatus, setSystemStatus] = useState({
    kernel: 'Active',
    ai: 'Llama-4 Scout - Online',
    whitelist: 'PID 64192',
    uptime: '00:00:00'
  });
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const fetchThreats = () => {
    // Just reset to demo data for sync simulation
    setThreats([...demoData]);
  };

  const downloadLogs = () => {
    const dataStr = JSON.stringify(threats, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `krynox_demo_logs_${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Uptime counter simulation
    let seconds = 0;
    const uptimeInterval = setInterval(() => {
      seconds++;
      const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      setSystemStatus(prev => ({ ...prev, uptime: `${h}:${m}:${s}` }));
    }, 1000);

    return () => clearInterval(uptimeInterval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [threats]);

  return (
    <div className="min-h-screen p-4 md:p-8 cyber-grid flex flex-col gap-6 max-w-7xl mx-auto overflow-hidden">
      {/* Disclaimer Banner */}
      <div className="bg-amber-500 text-black text-[10px] md:text-xs font-bold py-2 px-4 rounded-xl text-center uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.3)]">
        ⚠️ CLOUD DEMO MODE: This dashboard is displaying historical mock data. Krynox Aegis is a hardware-enforced eBPF kernel module and cannot be hosted as a web application.
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 glass-panel p-6 rounded-2xl neon-border-green">
        <div className="flex items-center gap-4">
          <img 
            src="Gemini_Generated_Image_5lnmiv5lnmiv5lnm-removebg-preview.png" 
            alt="Krynox Logo" 
            className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(0,255,204,0.5)]" 
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-white font-mono uppercase">
              Krynox <span className="text-cyber-green">Aegis</span>
            </h1>
            <p className="text-xs text-cyber-green/60 font-mono tracking-widest">ZERO-TRUST CLOUD DEMO</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-mono uppercase">System Uptime</span>
            <span className="text-xl font-mono text-white">{systemStatus.uptime}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-cyber-green/10 border border-cyber-green/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse-fast shadow-[0_0_10px_#00ffcc]" />
            <span className="text-xs font-bold text-cyber-green font-mono uppercase tracking-tighter">Demo Active</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Stats */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Kernel Module */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-6 rounded-2xl flex flex-col gap-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-5 h-5 text-cyber-blue" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Kernel Status</h2>
            </div>
            
            <div className="space-y-4">
              <StatusItem label="eBPF Module" value={systemStatus.kernel} active />
              <StatusItem label="AI Engine" value={systemStatus.ai} active />
              <StatusItem label="PID Whitelist" value={systemStatus.whitelist} color="text-cyber-blue" />
            </div>
          </motion.div>

          {/* Solana Module */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 bg-cyber-purple/5 rounded-full -mr-4 -mt-4" />
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-cyber-purple" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Solana Node</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Developer Wallet</span>
                <span className="text-xs font-mono text-cyber-purple break-all bg-cyber-purple/5 p-2 rounded block border border-cyber-purple/20 italic text-center">
                  {WALLET_ADDRESS}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Balance" value={`${solBalance.toFixed(10)} SOL`} sub="Devnet" />
                <StatCard label="Network TPS" value={networkStats.tps} sub="Static" color="text-cyber-green" />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Last Validated Blockhash</span>
                <span className="text-[10px] font-mono text-slate-400 truncate block text-center">
                  {networkStats.blockhash}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Middle Column - Threat Feed */}
        <div className="lg:col-span-8 flex flex-col gap-4 h-[600px]">
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyber-green" />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Live Threat Feed</h2>
            </div>
            <div className="flex gap-2">
              <ActionButton icon={<Download className="w-4 h-4" />} label="Download" onClick={downloadLogs} />
              <ActionButton icon={<RefreshCcw className="w-4 h-4" />} label="Sync" onClick={fetchThreats} />
              <ActionButton icon={<Trash2 className="w-4 h-4" />} label="Clear" onClick={() => setThreats([])} />
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="glass-panel rounded-2xl flex-grow overflow-y-auto terminal-scroll p-4 space-y-4 relative"
          >
            {threats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                <Activity className="w-12 h-12 opacity-20" />
                <p className="font-mono text-sm uppercase tracking-widest">Waiting for kernel events...</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {threats.map((threat, idx) => (
                  <ThreatCard 
                    key={idx} 
                    threat={threat} 
                    index={idx}
                    total={threats.length}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="mt-auto flex justify-between items-center px-4 py-2 text-[10px] text-slate-600 font-mono uppercase tracking-widest">
        <div className="flex gap-4">
          <span>LATENCY: 0ms (MOCK)</span>
          <span>BUFFER: 256kb</span>
          <span className="text-cyber-green animate-pulse">Connection: Secure</span>
        </div>
        <span className="opacity-40 italic">Standalone Cloud Demo Mode</span>
      </footer>
    </div>
  );
}

function StatusItem({ label, value, active, color = 'text-cyber-green' }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <span className="text-[10px] text-slate-500 font-mono uppercase">{label}</span>
      <div className="flex items-center gap-2">
        {active && <div className={`w-1.5 h-1.5 rounded-full ${color.replace('text', 'bg')} animate-pulse`} />}
        <span className={`text-xs font-bold font-mono ${color}`}>{value}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
      <span className="text-[10px] text-slate-500 font-mono uppercase block">{label}</span>
      <span className={`text-sm font-bold font-mono block ${color}`}>{value}</span>
      <span className="text-[8px] text-slate-600 font-mono uppercase">{sub}</span>
    </div>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-xs text-slate-400 hover:text-white"
    >
      {icon}
      <span className="font-mono uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function ThreatCard({ threat, index, total }) {
  const [isExpanded, setIsExpanded] = useState(index === 0);
  const isError = threat.tx_signature?.startsWith('Error') || threat.tx_signature?.startsWith('Blockchain Error');
  const isPending = threat.tx_signature === 'Pending...';
  
  const displayIndex = (total - index).toString().padStart(2, '0');
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`border-l-2 ${isPending ? 'border-cyber-blue animate-pulse' : 'border-cyber-red'} bg-white/5 rounded-r-xl overflow-hidden relative group transition-all duration-300 ${isExpanded ? 'p-4' : 'p-3'}`}
    >
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/30 font-bold tracking-widest">#{displayIndex}</span>
          <div className="flex items-center gap-2">
            {isPending ? (
              <RefreshCcw className="w-4 h-4 text-cyber-blue animate-spin" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-cyber-red" />
            )}
            <span className={`text-xs font-bold font-mono uppercase tracking-tighter ${isPending ? 'text-cyber-blue' : 'text-cyber-red'}`}>
              {isPending ? 'Intercepting Threat...' : `Threat Blocked: PID ${threat.pid}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-slate-600 font-mono hidden md:block">{new Date(threat.timestamp).toLocaleTimeString()}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className={`text-xs font-mono leading-relaxed pl-6 border-l border-white/10 ${isPending ? 'text-slate-500 italic' : 'text-slate-300'}`}>
                <ReactMarkdown 
                  components={{
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    h1: ({node, ...props}) => <h1 className="text-sm font-bold text-cyber-green mt-4 mb-2 uppercase" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-sm font-bold text-cyber-green mt-4 mb-2 uppercase" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-xs font-bold text-white mt-3 mb-1 uppercase" {...props} />,
                    strong: ({node, ...props}) => <strong className="text-cyber-green font-bold" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="text-[11px]" {...props} />,
                  }}
                >
                  {threat.report}
                </ReactMarkdown>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 mt-2">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Zap className={`w-3 h-3 ${isPending ? 'text-slate-600' : 'text-cyber-green'}`} />
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Audit Log:</span>
                  <span className={`text-[9px] font-mono truncate max-w-[200px] px-2 py-1 rounded ${isPending ? 'bg-white/5 text-slate-600' : 'bg-cyber-green/5 text-cyber-green'}`}>
                    {threat.tx_signature}
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-1 rounded border border-white/5 ${isPending ? 'text-slate-600' : 'text-cyber-green/60 bg-cyber-green/5'}`}>
                    Cost: {threat.tx_cost || '0 SOL'}
                  </span>
                </div>
                
                {threat.tx_signature && !isError && !isPending && (
                  <a 
                    href={`https://explorer.solana.com/tx/${threat.tx_signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-cyber-blue hover:underline font-mono uppercase"
                  >
                    Verify on Solscan <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
