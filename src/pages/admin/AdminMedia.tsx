import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Copy,
  ExternalLink,
  FolderOpen,
  Grid,
  HardDrive,
  List as ListIcon,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import type { DataTableColumn } from '../../components/admin';
import Button from '../../components/primitives/Button';
import { useAuth } from '../../hooks/useAuth';
import { useImageUpload } from '../../hooks/useImageUpload';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';

interface MediaAsset {
  id: string;
  name: string;
  url: string;
  folder: string;
  size?: number;
  type: string;
  source: 'media_library' | 'blog' | 'prompt' | 'avatar' | 'category';
  linkedTo?: string;
  uploadedBy?: string | null;
  createdAt: any;
}

const FOLDERS = ['all', 'general', 'blog', 'prompts', 'avatars', 'categories'] as const;
type FolderFilter = (typeof FOLDERS)[number];

const FOLDER_LABELS: Record<FolderFilter, string> = {
  all: 'All',
  general: 'General',
  blog: 'Blog',
  prompts: 'Prompts',
  avatars: 'Avatars',
  categories: 'Categories',
};

const SOURCE_LABEL: Record<MediaAsset['source'], string> = {
  media_library: 'Uploaded',
  blog: 'Blog',
  prompt: 'Prompt',
  avatar: 'Avatar',
  category: 'Category',
};

export default function AdminMedia() {
  const { user } = useAuth();
  const { uploadImage, isUploading } = useImageUpload();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<{ name: string; done: boolean }[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeFolder, setActiveFolder] = useState<FolderFilter>('all');
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Real-time Firestore listener
  useEffect(() => {
    const q = query(collection(db, 'media_assets'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      snap => {
        setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as MediaAsset)));
        setLoading(false);
      },
      err => {
        console.error(err);
        toast.error('Failed to load media assets');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Drag-and-drop handlers
  useEffect(() => {
    const el = dropZoneRef.current;
    if (!el) return;
    const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragOver(true); };
    const onDragLeave = () => setIsDragOver(false);
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
      if (files.length) processFiles(files);
    };
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, [activeFolder]);

  const processFiles = async (files: File[]) => {
    if (uploading) return;
    setUploading(true);
    setUploadQueue(files.map(f => ({ name: f.name, done: false })));

    const targetFolder = activeFolder === 'all' ? 'general' : activeFolder;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await uploadImage(file, targetFolder);
        if (result?.success) {
          await addDoc(collection(db, 'media_assets'), {
            name: result.name,
            url: result.url,
            folder: targetFolder,
            type: file.type,
            size: file.size,
            source: 'media_library',
            uploadedBy: user?.uid || null,
            createdAt: serverTimestamp(),
          });
          setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, done: true } : q));
        }
      } catch {
        toast.error(`Failed: ${file.name}`);
      }
    }

    setUploading(false);
    setUploadQueue([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    e.target.value = '';
    if (files.length) processFiles(files);
  };

  const handleDelete = async (asset: MediaAsset) => {
    const ok = await confirm({
      title: 'Remove from library?',
      description:
        asset.source !== 'media_library'
          ? `This removes the record from the media index. The image on "${asset.source}" content will not be affected.`
          : 'The record will be removed from the library index. The file will remain on Hostinger storage.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'media_assets', asset.id));
      if (selectedAsset?.id === asset.id) setSelectedAsset(null);
      toast.success('Removed from library');
    } catch {
      toast.error('Failed to remove');
    }
  };

  // Discover: scan Firestore collections for untracked image URLs
  const discoverAssets = async () => {
    setScanning(true);
    try {
      const existingUrls = new Set(assets.map(a => a.url));
      const newAssets: Omit<MediaAsset, 'id'>[] = [];

      const blogSnap = await getDocs(collection(db, 'blog_posts'));
      blogSnap.docs.forEach(d => {
        const data = d.data();
        if (data.coverImage && !existingUrls.has(data.coverImage)) {
          newAssets.push({
            name: data.coverImage.split('/').pop()?.split('?')[0] || 'blog-image.jpg',
            url: data.coverImage,
            folder: 'blog',
            type: 'image/jpeg',
            source: 'blog',
            linkedTo: d.id,
            uploadedBy: null,
            createdAt: data.createdAt || serverTimestamp(),
          });
          existingUrls.add(data.coverImage);
        }
      });

      const promptSnap = await getDocs(collection(db, 'prompts'));
      promptSnap.docs.forEach(d => {
        const data = d.data();
        if (data.imageUrl && !existingUrls.has(data.imageUrl)) {
          newAssets.push({
            name: data.imageUrl.split('/').pop()?.split('?')[0] || 'prompt-image.jpg',
            url: data.imageUrl,
            folder: 'prompts',
            type: 'image/jpeg',
            source: 'prompt',
            linkedTo: d.id,
            uploadedBy: null,
            createdAt: data.createdAt || serverTimestamp(),
          });
          existingUrls.add(data.imageUrl);
        }
      });

      const catSnap = await getDocs(collection(db, 'categories'));
      catSnap.docs.forEach(d => {
        const data = d.data();
        if (data.imageUrl && !existingUrls.has(data.imageUrl)) {
          newAssets.push({
            name: data.imageUrl.split('/').pop()?.split('?')[0] || 'category-image.jpg',
            url: data.imageUrl,
            folder: 'categories',
            type: 'image/jpeg',
            source: 'category',
            linkedTo: d.id,
            uploadedBy: null,
            createdAt: data.createdAt || serverTimestamp(),
          });
          existingUrls.add(data.imageUrl);
        }
      });

      if (newAssets.length === 0) {
        toast.success('Library is already up to date');
        return;
      }

      await Promise.all(newAssets.map(a => addDoc(collection(db, 'media_assets'), a)));
      toast.success(`Discovered ${newAssets.length} new asset${newAssets.length > 1 ? 's' : ''}`);
    } catch (err) {
      console.error(err);
      toast.error('Discovery scan failed');
    } finally {
      setScanning(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied!');
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filteredAssets = assets.filter(a => {
    if (activeFolder !== 'all' && a.folder !== activeFolder) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const folderCount = (f: FolderFilter) =>
    f === 'all' ? assets.length : assets.filter(a => a.folder === f).length;

  const totalSize = filteredAssets.reduce((s, a) => s + (a.size || 0), 0);

  const columns: DataTableColumn<MediaAsset>[] = [
    {
      key: 'file',
      header: 'File',
      render: a => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted flex-shrink-0 overflow-hidden border border-border">
            <img
              src={a.url}
              alt={a.name}
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate max-w-[200px] text-sm">{a.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{a.type}</p>
          </div>
        </div>
      ),
      searchValue: a => a.name,
    },
    {
      key: 'folder',
      header: 'Folder',
      render: a => (
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/5 text-primary capitalize">
          {a.folder}
        </span>
      ),
      sortable: true,
      sortValue: a => a.folder,
    },
    {
      key: 'size',
      header: 'Size',
      render: a => <span className="text-sm text-muted-foreground font-mono">{formatSize(a.size)}</span>,
      sortable: true,
      sortValue: a => a.size || 0,
    },
    {
      key: 'source',
      header: 'Source',
      render: a => (
        <span className={cn(
          'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg',
          a.source === 'media_library'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        )}>
          {SOURCE_LABEL[a.source]}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Uploaded',
      render: a => <span className="text-sm text-muted-foreground">{formatDate(a.createdAt)}</span>,
      sortable: true,
      sortValue: a => (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0),
    },
  ];

  return (
    <div className="space-y-6" ref={dropZoneRef}>
      {/* Drop-zone overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm border-4 border-dashed border-primary rounded-none flex items-center justify-center pointer-events-none">
          <div className="bg-card rounded-3xl p-10 text-center shadow-2xl border border-primary/20">
            <UploadCloud className="w-16 h-16 text-primary mx-auto mb-4 animate-bounce" />
            <p className="text-2xl font-black text-foreground">Drop to Upload</p>
            <p className="text-muted-foreground mt-1">Images will be saved to <span className="font-bold text-primary capitalize">{activeFolder === 'all' ? 'general' : activeFolder}</span></p>
          </div>
        </div>
      )}

      <AdminPageHeader
        label="Assets"
        labelIcon={HardDrive}
        title="Media Library"
        subtitle="Manage images and assets for blog and marketing. Drag &amp; drop images anywhere to upload."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={RefreshCw} isLoading={scanning} onClick={discoverAssets}>
              Discover
            </Button>
            <div className="flex bg-muted p-1 rounded-xl border border-border">
              <Button variant={viewMode === 'grid' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="px-3">
                <Grid className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === 'table' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="px-3">
                <ListIcon className="w-4 h-4" />
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*"
              multiple
            />
            <Button
              variant="primary"
              size="sm"
              leftIcon={UploadCloud}
              isLoading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </Button>
          </div>
        }
      />

      {/* Upload Queue Progress */}
      {uploadQueue.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
          <p className="text-sm font-bold text-foreground">
            Uploading {uploadQueue.length} file{uploadQueue.length > 1 ? 's' : ''}…
          </p>
          {uploadQueue.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                <div className="h-1 w-full bg-muted rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      item.done ? 'bg-emerald-500 w-full' : 'bg-primary w-2/3 animate-pulse'
                    )}
                  />
                </div>
              </div>
              <span className={cn('text-xs font-bold shrink-0 w-10 text-right', item.done ? 'text-emerald-500' : 'text-muted-foreground')}>
                {item.done ? 'Done' : '…'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Folder Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FOLDERS.map(folder => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5',
                activeFolder === folder
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {FOLDER_LABELS[folder]}
              <span className={cn(
                'text-[10px] font-black px-1.5 py-0.5 rounded-md',
                activeFolder === folder ? 'bg-white/20' : 'bg-background/60'
              )}>
                {folderCount(folder)}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search filename…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 h-9 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {!loading && filteredAssets.length > 0 && (
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <span><span className="font-bold text-foreground">{filteredAssets.length}</span> files</span>
          <span><span className="font-bold text-foreground">{filteredAssets.filter(a => a.type.startsWith('image/')).length}</span> images</span>
          {totalSize > 0 && <span><span className="font-bold text-foreground">{formatSize(totalSize)}</span> total</span>}
          <span><span className="font-bold text-foreground">{filteredAssets.filter(a => a.source === 'media_library').length}</span> direct uploads</span>
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={filteredAssets}
          rowKey={a => a.id}
          loading={loading}
          actions={{
            custom: [
              { icon: Copy, label: 'Copy URL', onClick: a => copyUrl(a.url) },
              { icon: ExternalLink, label: 'Open', onClick: a => window.open(a.url, '_blank') },
            ],
            onDelete: handleDelete,
          }}
        />
      ) : (
        /* Grid view */
        <>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="py-32 text-center bg-card border-2 border-dashed border-border rounded-3xl">
              <FolderOpen className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
              <p className="font-bold text-foreground text-lg">
                {search ? `No results for "${search}"` : 'No assets yet'}
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                {search
                  ? 'Try a different search term or clear the filter.'
                  : 'Upload images directly or click Discover to scan existing content.'}
              </p>
              {!search && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <Button variant="primary" size="sm" leftIcon={UploadCloud} onClick={() => fileInputRef.current?.click()}>
                    Upload Images
                  </Button>
                  <Button variant="outline" size="sm" leftIcon={RefreshCw} onClick={discoverAssets} isLoading={scanning}>
                    Discover Assets
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className="group relative aspect-square rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/50 transition-all shadow-sm hover:shadow-xl hover:shadow-primary/5 cursor-pointer"
                >
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={e => {
                      const t = e.currentTarget;
                      t.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.className = 'absolute inset-0 flex items-center justify-center bg-muted text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center p-2';
                      fallback.textContent = asset.name;
                      t.parentElement?.appendChild(fallback);
                    }}
                  />

                  {/* Source badge */}
                  {asset.source !== 'media_library' && (
                    <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                      {SOURCE_LABEL[asset.source]}
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={e => { e.stopPropagation(); copyUrl(asset.url); }}
                        className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
                        title="Copy URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); window.open(asset.url, '_blank'); }}
                        className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(asset); }}
                        className="w-7 h-7 rounded-lg bg-red-500/80 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-white/80 font-medium truncate w-full leading-tight">
                      {asset.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Image preview */}
            <div className="relative bg-muted/50 flex items-center justify-center overflow-hidden" style={{ maxHeight: '55vh' }}>
              <img
                src={selectedAsset.url}
                alt={selectedAsset.name}
                className="max-h-[55vh] w-auto max-w-full object-contain"
              />
              <button
                onClick={() => setSelectedAsset(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Details panel */}
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground text-lg truncate max-w-xs">{selectedAsset.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-primary/5 text-primary capitalize">
                      {selectedAsset.folder}
                    </span>
                    <span className={cn(
                      'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg',
                      selectedAsset.source === 'media_library'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    )}>
                      {SOURCE_LABEL[selectedAsset.source]}
                    </span>
                    {selectedAsset.size && (
                      <span className="text-xs text-muted-foreground">{formatSize(selectedAsset.size)}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(selectedAsset.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={ExternalLink}
                    onClick={() => window.open(selectedAsset.url, '_blank')}
                  >
                    Open
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={Copy}
                    onClick={() => copyUrl(selectedAsset.url)}
                  >
                    Copy URL
                  </Button>
                </div>
              </div>

              {/* URL display */}
              <div
                className="p-3 rounded-xl bg-muted border border-border cursor-pointer hover:border-primary/50 transition-colors group"
                onClick={() => copyUrl(selectedAsset.url)}
                title="Click to copy"
              >
                <p className="text-xs text-muted-foreground font-mono break-all select-all group-hover:text-foreground transition-colors">
                  {selectedAsset.url}
                </p>
              </div>

              {selectedAsset.linkedTo && (
                <p className="text-xs text-muted-foreground">
                  Linked to document: <span className="font-mono text-foreground">{selectedAsset.linkedTo}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
