import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  FilePlus,
  Globe,
  Image as ImageIcon,
  Key,
  Loader2,
  Server,
  Settings as SettingsIcon,
  Trash2,
  Upload,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';

interface Asset {
  id: string;
  name: string;
  url: string;
  createdAt: any;
}

interface FTPConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  path: string;
  endpoint: string;
}

export default function AdminAssetManager() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const [config, setConfig] = useState<FTPConfig>({
    enabled: false,
    host: 'ftp.techworldproduct.com',
    port: 21,
    username: '',
    password: '',
    path: 'public_html/promptly/public/',
    endpoint: 'https://techworldproduct.com/promptly/public/'
  });

  useEffect(() => {
    fetchAssets();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'configs', 'ftp'));
      if (docSnap.exists()) {
        setConfig(prev => ({ ...prev, ...docSnap.data() }));
      }
    } catch (err) {
      console.error("Failed to load FTP config:", err);
    }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      await setDoc(doc(db, 'configs', 'ftp'), {
        ...config,
        updatedAt: serverTimestamp()
      });
      toast.success("FTP Settings Saved!");
      setShowConfig(false);
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSavingConfig(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/test-ftp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Connection Successful! 🚀", { duration: 4000 });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(`Connection Failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const q = query(collection(db, 'assets'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Asset[];
      setAssets(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!config.enabled) {
      toast.error("FTP Storage is disabled. Enable it in settings first.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-ftp', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        await addDoc(collection(db, 'assets'), {
          name: data.name,
          url: data.url,
          createdAt: serverTimestamp(),
        });
        toast.success("Uploaded to Hostinger!");
        fetchAssets();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL Copied!");
  };

  const deleteAsset = async (id: string) => {
    if (!confirm("Are you sure? This only removes the record, not the file on FTP.")) return;
    try {
      await deleteDoc(doc(db, 'assets', id));
      setAssets(prev => prev.filter(a => a.id !== id));
      toast.success("Asset removed from library");
    } catch (err) {
      toast.error("Failed to remove asset");
    }
  };

  return (
    <div className="space-y-12">
      {/* FTP Config Panel */}
      <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
        <div className="flex items-center gap-4 mb-10 border-b border-slate-50">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">FTP Storage Configuration</h3>
            <p className="text-slate-500 font-medium">Connect and manage your Hostinger storage vault.</p>
          </div>
        </div>

        <div className="max-w-4xl space-y-10">
          {/* Header Toggle */}
          <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <div className="flex items-center gap-4">
              <Zap className={`w-8 h-8 ${config.enabled ? 'text-amber-500' : 'text-slate-300'}`} />
              <div>
                <p className="font-black text-slate-900">Enable FTP Storage</p>
                <p className="text-xs text-slate-500 font-medium">When enabled, all uploads go to Hostinger.</p>
              </div>
            </div>
            <button
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`w-14 h-8 rounded-full transition-all relative ${config.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${config.enabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* Grid Fields */}
          <div className="grid md:grid-cols-2 gap-8 mb-0">
            <ConfigField label="Hostname" icon={Globe} value={config.host} onChange={v => setConfig({...config, host: v})} placeholder="ftp.domain.com" />
            <ConfigField label="Port" icon={SettingsIcon} value={String(config.port)} onChange={v => setConfig({...config, port: parseInt(v) || 21})} placeholder="21" />
            <ConfigField label="Username" icon={Server} value={config.username} onChange={v => setConfig({...config, username: v})} placeholder="techwrd" />
            <ConfigField label="Password" icon={Key} value={config.password} onChange={v => setConfig({...config, password: v})} type="password" placeholder="••••••••" />
            <ConfigField label="FTP Path" icon={Server} value={config.path} onChange={v => setConfig({...config, path: v})} placeholder="public_html/uploads/" />
            <ConfigField label="FTP Endpoint" icon={Globe} value={config.endpoint} onChange={v => setConfig({...config, endpoint: v})} placeholder="https://domain.com/uploads/" />
          </div>

          <div className="flex items-center gap-4 pt-6">
            <button
              onClick={testConnection}
              disabled={testing}
              className="bg-rose-500 text-white px-8 py-4 rounded-2xl font-black hover:bg-rose-600 transition-all shadow-xl shadow-rose-100 flex items-center gap-2 disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              Test Connection
            </button>
            <button
              onClick={saveConfig}
              disabled={savingConfig}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 disabled:opacity-50"
            >
              {savingConfig ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      {!config.enabled ? (
        <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-[3rem] p-16 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-amber-900 mb-2">FTP Storage Disabled</h3>
          <p className="text-amber-700 font-medium max-w-sm mx-auto">Enable FTP Storage in the configuration panel above to start uploading assets to Hostinger.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-12 text-center relative group overflow-hidden">
          <div className="relative z-10">
            <div className="bg-indigo-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
              {uploading ? (
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              ) : (
                <FilePlus className="w-10 h-10 text-indigo-600" />
              )}
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              {uploading ? "Sailing to Hostinger..." : "Upload New Asset"}
            </h3>
            <p className="text-slate-500 font-medium mb-8 max-w-sm mx-auto">
              Your files will be securely stored in your 100GB Hostinger vault.
            </p>

            <label className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 cursor-pointer">
              <Upload className="w-5 h-5" />
              Select Image
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>

          {uploading && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              className="absolute bottom-0 left-0 h-2 bg-indigo-600/10"
            />
          )}
        </div>
      )}

      {/* Asset Library */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="aspect-square bg-slate-100 rounded-3xl animate-pulse" />
          ))
        ) : assets.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <ImageIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">No assets found in your vault.</p>
          </div>
        ) : (
          assets.map((asset) => (
            <motion.div
              layout
              key={asset.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2rem] border border-slate-100 p-3 shadow-sm group hover:shadow-xl hover:shadow-indigo-50 transition-all duration-500"
            >
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 mb-4 relative">
                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                  <button
                    onClick={() => copyUrl(asset.url)}
                    className="p-3 bg-white rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-lg"
                    title="Copy URL"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-white rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-lg"
                    title="Open Original"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <button
                    onClick={() => deleteAsset(asset.id)}
                    className="p-3 bg-white rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-lg"
                    title="Delete Record"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="px-2 pb-1">
                <p className="text-sm font-black text-slate-900 truncate" title={asset.name}>
                  {asset.name}
                </p>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mt-1">
                  Hostinger Storage
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function ConfigField({ label, icon: Icon, value, onChange, type = 'text', placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
        <Icon className="w-3 h-3 text-indigo-400" />
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-100 rounded-2xl p-4 focus:border-indigo-600 focus:outline-none transition-all font-bold text-slate-900 shadow-sm"
      />
    </div>
  );
}
