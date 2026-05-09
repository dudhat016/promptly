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
import { useImageUpload } from '../../hooks/useImageUpload';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { cn } from '../../lib/utils';

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
  const { uploadImage, isUploading } = useImageUpload();
  const [showConfig, setShowConfig] = useState(false);
  const [testing, setTesting] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('assets');
  const [savingConfig, setSavingConfig] = useState(false);

  const [config, setConfig] = useState<FTPConfig>({
    enabled: false,
    host: 'ftp.techworldproduct.com',
    port: 21,
    username: '',
    password: '',
    path: 'promptly/public/',
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
        toast.success("Connection Successful! ðŸš€", { duration: 4000 });
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

    const data = await uploadImage(file, selectedFolder);
    
    if (data?.success) {
      try {
        await addDoc(collection(db, 'assets'), {
          name: data.name,
          url: data.url,
          createdAt: serverTimestamp(),
        });
        fetchAssets();
      } catch (err) {
        console.error('Firestore Update Error:', err);
        toast.error('Failed to save asset record');
      }
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
    <div className="space-y-8">
      {/* FTP Config Panel */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-border">
          <div className="bg-primary/10 text-primary p-2 rounded-md">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">FTP Storage Configuration</h3>
            <p className="text-sm text-muted-foreground">Connect and manage your Hostinger storage vault.</p>
          </div>
        </div>

        <div className="max-w-4xl space-y-6">
          {/* Header Toggle */}
          <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Zap className={`w-5 h-5 ${config.enabled ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">Enable FTP Storage</p>
                <p className="text-xs text-muted-foreground">When enabled, all uploads go to Hostinger.</p>
              </div>
            </div>
            <Button
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              variant={config.enabled ? 'primary' : 'ghost'}
              size="sm"
              className={cn(
                "w-12 h-6 rounded-full transition-all relative p-0",
                config.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            >
              <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", config.enabled ? 'left-7' : 'left-1')} />
            </Button>
          </div>

          {/* Grid Fields */}
          <div className="grid md:grid-cols-2 gap-5">
            <ConfigField label="Hostname" icon={Globe} value={config.host} onChange={v => setConfig({...config, host: v})} placeholder="ftp.domain.com" />
            <ConfigField label="Port" icon={SettingsIcon} value={String(config.port)} onChange={v => setConfig({...config, port: parseInt(v) || 21})} placeholder="21" />
            <ConfigField label="Username" icon={Server} value={config.username} onChange={v => setConfig({...config, username: v})} placeholder="techwrd" />
            <ConfigField label="Password" icon={Key} value={config.password} onChange={v => setConfig({...config, password: v})} type="password" placeholder="••••••••" />
            <ConfigField label="FTP Path" icon={Server} value={config.path} onChange={v => setConfig({...config, path: v})} placeholder="public_html/uploads/" />
            <ConfigField label="FTP Endpoint" icon={Globe} value={config.endpoint} onChange={v => setConfig({...config, endpoint: v})} placeholder="https://domain.com/uploads/" />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={testConnection}
              isLoading={testing}
              variant="outline"
              size="md"
              leftIcon={Zap}
              className="bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20 font-semibold"
            >
              Test Connection
            </Button>
            <Button
              onClick={saveConfig}
              isLoading={savingConfig}
              variant="primary"
              size="md"
              leftIcon={CheckCircle2}
              className="font-semibold"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      {!config.enabled ? (
        <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-lg p-10 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-amber-900 mb-1">FTP Storage Disabled</h3>
          <p className="text-sm text-amber-700 max-w-sm mx-auto">Enable FTP Storage in the configuration panel above to start uploading assets to Hostinger.</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border-2 border-dashed border-border p-10 text-center relative group overflow-hidden">
          <div className="relative z-10">
            <div className="bg-primary/8 w-14 h-14 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500">
              {isUploading ? (
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              ) : (
                <FilePlus className="w-7 h-7 text-primary" />
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {isUploading ? "Uploading to Hostinger..." : "Upload New Asset"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Your files will be securely stored in your 100GB Hostinger vault.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {['assets', 'blog', 'banners', 'icons'].map(folder => (
                <Button
                  key={folder}
                  onClick={() => setSelectedFolder(folder)}
                  variant={selectedFolder === folder ? 'primary' : 'ghost'}
                  size="sm"
                  className={cn(
                    "capitalize font-semibold",
                    selectedFolder !== folder && "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {folder}
                </Button>
              ))}
            </div>

            <Button
              as="label"
              variant="primary"
              size="lg"
              leftIcon={Upload}
              className="cursor-pointer font-semibold"
            >
              Select Image
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
            </Button>
          </div>

          {isUploading && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              className="absolute bottom-0 left-0 h-1 bg-primary/30"
            />
          )}
        </div>
      )}

      {/* Asset Library */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
          ))
        ) : assets.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No assets found in your vault.</p>
          </div>
        ) : (
          assets.map((asset) => (
            <motion.div
              layout
              key={asset.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-md border border-border p-2 shadow-sm group hover:shadow-md transition-all duration-300"
            >
              <div className="aspect-square rounded-md overflow-hidden bg-muted/50 mb-3 relative">
                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-sm">
                  <Button
                    onClick={() => copyUrl(asset.url)}
                    variant="ghost"
                    size="icon"
                    className="bg-card/90 hover:bg-primary hover:text-primary-foreground"
                    title="Copy URL"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    as="a"
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    variant="ghost"
                    size="icon"
                    className="bg-card/90 hover:bg-primary hover:text-primary-foreground"
                    title="Open Original"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => deleteAsset(asset.id)}
                    variant="ghost"
                    size="icon"
                    className="bg-card/90 hover:bg-rose-600 hover:text-white"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="px-1 pb-1">
                <p className="text-xs font-semibold text-foreground truncate" title={asset.name}>
                  {asset.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
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
    <Input
      label={label}
      leftIcon={Icon}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      variant="filled"
    />
  );
}
