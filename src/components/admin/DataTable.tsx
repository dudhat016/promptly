import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ChevronUp,
  Download,
  Edit2,
  Eye,
  FileJson,
  FileText,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import Tooltip from '../overlays/Tooltip';
import Button from '../primitives/Button';
import Checkbox from '../primitives/Checkbox';
import Input from '../primitives/Input';
import Select from '../primitives/Select';
import { useConfirm } from './ConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  searchValue?: (row: T) => string;
  hideable?: boolean;        // can user hide this column? (default true)
  defaultHidden?: boolean;
  csvValue?: (row: T) => string | number;
}

interface RowAction<T> {
  icon: React.ElementType;
  label: string;
  onClick: (row: T) => void;
  className?: string;
}

export interface DataTableActions<T> {
  view?: string | ((row: T) => string);
  viewExternal?: string | ((row: T) => string);
  edit?: string | ((row: T) => string);
  onDelete?: (row: T) => void | Promise<void>;
  custom?: RowAction<T>[];
  bulk?: {
    icon: React.ElementType;
    label: string;
    onClick: (rows: T[]) => void;
    className?: string;
  }[];
}

export interface BulkAction<T> {
  label: string;
  icon?: React.ElementType;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  onClick: (rows: T[]) => void | Promise<void>;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyIcon?: React.ElementType;
  emptyTitle?: string;
  emptyMessage?: string;
  actions?: DataTableActions<T>;
  searchPlaceholder?: string;
  selectable?: boolean;
  onBulkDelete?: (rows: T[]) => Promise<void>;
  bulkActions?: BulkAction<T>[];
  exportFilename?: string;
  toolbar?: React.ReactNode;
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV<T>(columns: DataTableColumn<T>[], rows: T[], filename: string) {
  const exportCols = columns.filter(c => c.csvValue);
  if (exportCols.length === 0) return;
  const header = exportCols.map(c => `"${c.header}"`).join(',');
  const body = rows.map(row =>
    exportCols.map(c => {
      const val = String(c.csvValue!(row) ?? '');
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(',')
  ).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON<T>(columns: DataTableColumn<T>[], rows: T[], filename: string) {
  const exportCols = columns.filter(c => c.csvValue);
  if (exportCols.length === 0) return;
  const data = rows.map(row => {
    const obj: any = {};
    exportCols.forEach(c => {
      obj[c.header] = c.csvValue!(row);
    });
    return obj;
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF<T>(columns: DataTableColumn<T>[], rows: T[], filename: string) {
  const exportCols = columns.filter(c => c.csvValue);
  if (exportCols.length === 0) return;

  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text(filename.charAt(0).toUpperCase() + filename.slice(1).replace(/_/g, ' '), 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

  const tableColumn = exportCols.map(c => c.header);
  const tableRows = rows.map(row =>
    exportCols.map(c => String(c.csvValue!(row) ?? ''))
  );

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    headStyles: { fillColor: [99, 58, 240], textColor: 255, fontSize: 10, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });

  doc.save(`${filename}.pdf`);
}

// ─── Page number helpers ──────────────────────────────────────────────────────

function getPageNumbers(page: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (page > 3) pages.push('...');
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (page < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 6,
  emptyIcon: EmptyIcon,
  emptyTitle = 'No records found',
  emptyMessage = 'Records will appear here once available.',
  actions,
  searchPlaceholder = 'Search...',
  selectable = false,
  onBulkDelete,
  bulkActions,
  exportFilename,
  toolbar,
}: DataTableProps<T>) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(
    new Set(columns.filter(c => c.defaultHidden).map(c => c.key))
  );
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setColMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  useEffect(() => { setPage(1); }, [search, pageSize]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const visibleColumns = useMemo(
    () => columns.filter(c => !hiddenCols.has(c.key)),
    [columns, hiddenCols]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => col.searchValue?.(row).toLowerCase().includes(q))
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find(c => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function toggleCol(key: string) {
    setHiddenCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const pageIds = paginated.map(r => rowKey(r));
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const somePageSelected = pageIds.some(id => selected.has(id));

  function toggleSelectAll() {
    setSelected(prev => {
      const next = new Set(prev);
      allPageSelected
        ? pageIds.forEach(id => next.delete(id))
        : pageIds.forEach(id => next.add(id));
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedRows = data.filter(r => selected.has(rowKey(r)));

  async function handleBulkDelete() {
    if (!onBulkDelete || selectedRows.length === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedRows.length} record${selectedRows.length !== 1 ? 's' : ''}?`,
      description: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setBulkDeleting(true);
    try {
      await onBulkDelete(selectedRows);
      setSelected(new Set());
    } finally {
      setBulkDeleting(false);
    }
  }

  const hasActions = !!(
    actions && (actions.view || actions.viewExternal || actions.edit || actions.onDelete || (actions.custom?.length ?? 0) > 0)
  );
  const colCount = (selectable ? 1 : 0) + visibleColumns.length + (hasActions ? 1 : 0);
  const startRow = Math.min((page - 1) * pageSize + 1, sorted.length);
  const endRow = Math.min(page * pageSize, sorted.length);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            id="tableSearch"
            name="tableSearch"
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={Search}
            className="w-full"
            variant="outline"
            rightAction={search ? (
              <Button
                onClick={() => setSearch('')}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            ) : undefined}
          />
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Rows per page */}
          <div className="w-[130px]">
            <Select
              value={String(pageSize)}
              onChange={val => setPageSize(Number(val))}
              options={PAGE_SIZE_OPTIONS.map(n => ({ label: `${n} / page`, value: String(n) }))}
              isSearchable={false}
            />
          </div>

          {/* Column visibility */}
          <div className="relative" ref={colMenuRef}>
            <Button
              onClick={() => setColMenuOpen(v => !v)}
              variant={colMenuOpen ? 'primary' : 'outline'}
              size="md"
              leftIcon={SlidersHorizontal}
              className={cn("px-3 font-bold", !colMenuOpen && "bg-card text-muted-foreground hover:text-foreground")}
            >
              Columns
              {hiddenCols.size > 0 && (
                <span className="ml-1.5 w-4 h-4 bg-white/20 text-white rounded-full text-[9px] flex items-center justify-center leading-none">
                  {hiddenCols.size}
                </span>
              )}
            </Button>

            {colMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border">
                  <p className="text-md font-semibold tracking-widest text-muted-foreground">Toggle Columns</p>
                </div>
                <div className="p-2 space-y-0.5">
                  {columns.filter(c => c.hideable !== false).map(col => (
                    <Button
                      key={col.key}
                      onClick={() => toggleCol(col.key)}
                      variant="ghost"
                      size="sm"
                      fullWidth
                      className="justify-start px-3 py-2 h-auto [&>span]:flex [&>span]:items-center [&>span]:gap-3 [&>span]:w-full"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${!hiddenCols.has(col.key) ? 'bg-primary border-primary' : 'border-border'}`}>
                        {!hiddenCols.has(col.key) && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-foreground">{col.header}</span>
                    </Button>
                  ))}
                </div>
                {hiddenCols.size > 0 && (
                  <div className="px-4 py-2.5 border-t border-border">
                    <Button onClick={() => setHiddenCols(new Set())} variant="ghost" size="sm" className="text-primary hover:underline font-bold">
                      Show all columns
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export Menu */}
          {exportFilename && (
            <div className="relative" ref={exportMenuRef}>
              <Button
                onClick={() => setExportMenuOpen(v => !v)}
                variant={exportMenuOpen ? 'primary' : 'outline'}
                size="md"
                leftIcon={Download}
                title={selectedRows.length > 0 ? `Export ${selectedRows.length} selected rows` : 'Export records'}
                className={cn("px-3 font-bold", !exportMenuOpen && "bg-card text-muted-foreground hover:text-foreground")}
              >
                Export
                {selectedRows.length > 0 && (
                  <span className="ml-1.5 w-4 h-4 bg-white/20 text-white rounded-full text-[9px] flex items-center justify-center leading-none">
                    {selectedRows.length}
                  </span>
                )}
              </Button>

              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border">
                    <p className="text-md font-semibold text-muted-foreground">Download As</p>
                  </div>
                  <div className="p-2 space-y-0.5">
                    <Button
                      onClick={() => {
                        exportCSV(columns, selectedRows.length > 0 ? selectedRows : sorted, exportFilename);
                        setExportMenuOpen(false);
                      }}
                      variant="ghost"
                      size="sm"
                      fullWidth
                      leftIcon={Download}
                      className="justify-start gap-3 px-3 py-2 h-auto text-foreground"
                    >
                      CSV Spreadsheet
                    </Button>
                    <Button
                      onClick={() => {
                        exportJSON(columns, selectedRows.length > 0 ? selectedRows : sorted, exportFilename);
                        setExportMenuOpen(false);
                      }}
                      variant="ghost"
                      size="sm"
                      fullWidth
                      leftIcon={FileJson}
                      className="justify-start gap-3 px-3 py-2 h-auto text-foreground"
                    >
                      JSON Data
                    </Button>
                    <Button
                      onClick={() => {
                        exportPDF(columns, selectedRows.length > 0 ? selectedRows : sorted, exportFilename);
                        setExportMenuOpen(false);
                      }}
                      variant="ghost"
                      size="sm"
                      fullWidth
                      leftIcon={FileText}
                      className="justify-start gap-3 px-3 py-2 h-auto text-foreground"
                    >
                      PDF Document
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {toolbar}
      </div>

      {/* ── Bulk Action Bar ── */}
      {selectable && selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-black text-primary-foreground">{selected.size}</span>
          </div>
          <span className="text-sm font-bold text-primary">{selected.size} selected</span>
          <Button onClick={() => setSelected(new Set())} variant="ghost" size="sm" leftIcon={X} className="text-muted-foreground hover:text-foreground font-bold">
            Clear
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {actions?.bulk?.map((action, i) => (
              <Button
                key={i}
                onClick={() => action.onClick(selectedRows)}
                variant="white"
                size="sm"
                leftIcon={action.icon}
                className={cn("font-bold border border-border", action.className)}
              >
                {action.label}
              </Button>
            ))}
            {bulkActions?.map((action, i) => (
              <Button
                key={i}
                onClick={() => action.onClick(selectedRows)}
                variant={action.variant === 'danger' ? 'danger' : action.variant === 'warning' ? 'white' : action.variant === 'success' ? 'white' : 'white'}
                size="sm"
                leftIcon={action.icon}
                className={cn(
                  "font-bold border border-border",
                  action.variant === 'danger' && "bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20",
                  action.variant === 'warning' && "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20",
                  action.variant === 'success' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20",
                )}
              >
                {action.label}
              </Button>
            ))}
            {exportFilename && (
              <Button onClick={() => exportCSV(columns, selectedRows, exportFilename)} variant="white" size="sm" leftIcon={Download} className="font-bold border border-border">
                Export Selected
              </Button>
            )}
            {onBulkDelete && (
              <Button onClick={handleBulkDelete} isLoading={bulkDeleting} variant="danger" size="sm" leftIcon={Trash2} className="font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20">
                Delete Selected
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="thead-row">
                {selectable && (
                  <th className="th w-12 px-4">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        variant="simple"
                        checked={allPageSelected}
                        indeterminate={somePageSelected && !allPageSelected}
                        onChange={toggleSelectAll}
                      />
                    </div>
                  </th>
                )}
                {visibleColumns.map(col => (
                  <th
                    key={col.key}
                    className={`th select-none ${col.sortable ? 'cursor-pointer group' : ''} ${col.className ?? ''}`}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && (
                        <span className="transition-opacity opacity-30 group-hover:opacity-100 flex-shrink-0">
                          {sortKey === col.key
                            ? sortDir === 'asc'
                              ? <ChevronUp className="w-3.5 h-3.5" />
                              : <ChevronDown className="w-3.5 h-3.5" />
                            : <ArrowUpDown className="w-3 h-3" />
                          }
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {hasActions && (
                  <th className="th text-right pr-5">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i} className="tr">
                    {selectable && (
                      <td className="td w-12 px-4">
                        <div className="flex items-center justify-center">
                          <div className="w-4 h-4 skeleton rounded" />
                        </div>
                      </td>
                    )}
                    {visibleColumns.map((col, j) => (
                      <td key={col.key} className="td">
                        <div
                          className="h-4 skeleton rounded"
                          style={{ width: `${[70, 50, 60, 40, 75][j % 5]}%`, animationDelay: `${i * 60}ms` }}
                        />
                      </td>
                    ))}
                    {hasActions && (
                      <td className="td">
                        <div className="h-8 skeleton w-20 ml-auto rounded-md" />
                      </td>
                    )}
                  </tr>
                ))
              ) : paginated.length > 0 ? (
                paginated.map(row => {
                  const id = rowKey(row);
                  return (
                    <tr
                      key={id}
                      className={`tr ${selected.has(id) ? 'bg-primary/[0.04]' : ''}`}
                    >
                      {selectable && (
                        <td className="td w-12 px-4">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              variant="simple"
                              checked={selected.has(id)}
                              onChange={() => toggleRow(id)}
                            />
                          </div>
                        </td>
                      )}
                      {visibleColumns.map(col => (
                        <td key={col.key} className={`td ${col.className ?? ''}`}>
                          {col.render(row)}
                        </td>
                      ))}
                      {hasActions && (
                        <td className="td">
                          <div className="flex items-center justify-end gap-1 pr-1">
                            {actions!.custom?.map((action, i) => (
                              <Tooltip key={i} content={action.label}>
                                <Button
                                  onClick={() => action.onClick(row)}
                                  variant="ghost"
                                  size="icon"
                                  className={cn("w-8 h-8 text-muted-foreground hover:text-foreground", action.className)}
                                >
                                  <action.icon className="w-4 h-4" />
                                </Button>
                              </Tooltip>
                            ))}
                            {actions!.viewExternal && (
                              <Tooltip content="View">
                                <Button
                                  as="a"
                                  href={typeof actions!.viewExternal === 'function' ? actions!.viewExternal(row) : actions!.viewExternal}
                                  target="_blank"
                                  rel="noreferrer"
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 text-muted-foreground hover:text-foreground"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Tooltip>
                            )}
                            {actions!.view && (
                              <Tooltip content="View">
                                <Button
                                  as={Link}
                                  to={typeof actions!.view === 'function' ? actions!.view(row) : actions!.view}
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 text-muted-foreground hover:text-foreground"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Tooltip>
                            )}
                            {actions!.edit && (
                              <Tooltip content="Edit">
                                <Button
                                  as={Link}
                                  to={typeof actions!.edit === 'function' ? actions!.edit(row) : actions!.edit}
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 text-muted-foreground hover:text-primary"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </Tooltip>
                            )}
                            {actions!.onDelete && (
                              <Tooltip content="Delete">
                                <Button
                                  onClick={() => actions!.onDelete!(row)}
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={colCount} className="py-20 text-center">
                    {EmptyIcon && (
                      <div className="w-12 h-12 bg-muted/60 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <EmptyIcon className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <p className="font-bold text-foreground mb-1">
                      {search ? 'No results found' : emptyTitle}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {search ? `No records match "${search}"` : emptyMessage}
                    </p>
                    {search && (
                      <Button onClick={() => setSearch('')} variant="ghost" size="sm" className="mt-3 text-primary hover:underline font-bold">
                        Clear search
                      </Button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer: count + pagination ── */}
        {!loading && sorted.length > 0 && (
          <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-t border-border bg-muted/20 flex-wrap">
            <p className="text-xs font-medium text-muted-foreground">
              Showing{' '}
              <span className="font-bold text-foreground">{startRow}–{endRow}</span>
              {' '}of{' '}
              <span className="font-bold text-foreground">{sorted.length}</span> records
              {sorted.length !== data.length && (
                <span className="text-muted-foreground/60 ml-1.5">(filtered from {data.length})</span>
              )}
            </p>

            <div className="flex items-center gap-1">
              <Tooltip content="First page">
                <Button onClick={() => setPage(1)} disabled={page === 1} variant="outline" size="icon" className="w-8 h-8">
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </Button>
              </Tooltip>
              <Tooltip content="Previous page">
                <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="outline" size="icon" className="w-8 h-8">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
              </Tooltip>

              {getPageNumbers(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-xs select-none">···</span>
                ) : (
                  <Button
                    key={p}
                    onClick={() => setPage(p as number)}
                    variant={page === p ? 'primary' : 'outline'}
                    size="icon"
                    className={cn("w-8 h-8 font-bold text-xs", page === p ? "shadow-sm" : "")}
                  >
                    {p}
                  </Button>
                )
              )}

              <Tooltip content="Next page">
                <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} variant="outline" size="icon" className="w-8 h-8">
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Tooltip>
              <Tooltip content="Last page">
                <Button onClick={() => setPage(totalPages)} disabled={page === totalPages} variant="outline" size="icon" className="w-8 h-8">
                  <ChevronsRight className="w-3.5 h-3.5" />
                </Button>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
