import { useState, useMemo, useRef, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Search, ChevronUp, ChevronDown, ArrowUpDown,
  Eye, Edit2, Trash2, Download, SlidersHorizontal,
  X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useConfirm } from './ConfirmModal';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';
import { cn } from '../../lib/utils';

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
  exportFilename?: string;
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
  exportFilename,
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
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setColMenuOpen(false);
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
    <div className="space-y-3">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          id="tableSearch"
          name="tableSearch"
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={Search}
          className="flex-1 min-w-[180px] max-w-xs"
          variant="filled"
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

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Rows per page */}
          <div className="w-32">
            <Select
              value={String(pageSize)}
              onChange={val => setPageSize(Number(val))}
              options={PAGE_SIZE_OPTIONS.map(n => ({
                label: `${n} / page`,
                value: String(n)
              }))}
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
              className={cn(
                "px-3 font-bold",
                !colMenuOpen && "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              Columns
              {hiddenCols.size > 0 && (
                <span className="ml-2 w-4 h-4 bg-white/20 text-white rounded-full text-[9px] flex items-center justify-center leading-none">
                  {hiddenCols.size}
                </span>
              )}
            </Button>

            {colMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Toggle Columns
                  </p>
                </div>
                <div className="p-2 space-y-0.5">
                  {columns.filter(c => c.hideable !== false).map(col => (
                    <Button
                      key={col.key}
                      onClick={() => toggleCol(col.key)}
                      variant="ghost"
                      size="sm"
                      fullWidth
                      className="justify-start gap-3 px-3 py-2 h-auto"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        !hiddenCols.has(col.key) ? 'bg-primary border-primary' : 'border-border'
                      }`}>
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
                  <div className="px-4 py-3 border-t border-border">
                    <Button
                      onClick={() => setHiddenCols(new Set())}
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:underline font-bold"
                    >
                      Show all columns
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export CSV */}
          {exportFilename && (
            <Button
              onClick={() => exportCSV(columns, selectedRows.length > 0 ? selectedRows : sorted, exportFilename)}
              variant="outline"
              size="md"
              leftIcon={Download}
              title={selectedRows.length > 0 ? `Export ${selectedRows.length} selected rows` : 'Export all as CSV'}
              className="bg-card text-muted-foreground hover:text-foreground font-bold"
            >
              {selectedRows.length > 0 ? `Export (${selectedRows.length})` : 'Export CSV'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      {selectable && selected.size > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
          <span className="text-sm font-bold text-primary">{selected.size} selected</span>
          <Button
            onClick={() => setSelected(new Set())}
            variant="ghost"
            size="sm"
            leftIcon={X}
            className="text-muted-foreground hover:text-foreground font-bold"
          >
            Clear
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {exportFilename && (
              <Button
                onClick={() => exportCSV(columns, selectedRows, exportFilename)}
                variant="white"
                size="sm"
                leftIcon={Download}
                className="font-bold border border-border"
              >
                Export Selected
              </Button>
            )}
            {onBulkDelete && (
              <Button
                onClick={handleBulkDelete}
                isLoading={bulkDeleting}
                variant="danger"
                size="sm"
                leftIcon={Trash2}
                className="font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20"
              >
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
                  <th className="th w-10">
                    <Checkbox 
                      variant="simple"
                      checked={allPageSelected}
                      indeterminate={somePageSelected && !allPageSelected}
                      onChange={toggleSelectAll}
                    />
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
                {hasActions && <th className="th text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i} className="tr">
                    {selectable && (
                      <td className="td">
                        <div className="w-4 h-4 bg-muted/60 rounded animate-pulse" />
                      </td>
                    )}
                    {visibleColumns.map((col, j) => (
                      <td key={col.key} className="td">
                        <div
                          className="h-4 bg-muted/60 rounded animate-pulse"
                          style={{ width: `${[75, 55, 65, 45, 80][j % 5]}%`, animationDelay: `${i * 60}ms` }}
                        />
                      </td>
                    ))}
                    {hasActions && (
                      <td className="td">
                        <div className="h-4 bg-muted/60 rounded animate-pulse w-20 ml-auto" />
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
                      className={`tr transition-colors ${selected.has(id) ? 'bg-primary/5' : ''}`}
                    >
                      {selectable && (
                        <td className="td">
                          <Checkbox 
                            variant="simple"
                            checked={selected.has(id)}
                            onChange={() => toggleRow(id)}
                          />
                        </td>
                      )}
                      {visibleColumns.map(col => (
                        <td key={col.key} className={`td ${col.className ?? ''}`}>
                          {col.render(row)}
                        </td>
                      ))}
                      {hasActions && (
                        <td className="td text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {actions!.custom?.map((action, i) => (
                              <Button
                                key={i}
                                onClick={() => action.onClick(row)}
                                variant="ghost"
                                size="icon"
                                title={action.label}
                                className={cn("text-muted-foreground hover:text-foreground hover:bg-muted/50", action.className)}
                              >
                                <action.icon className="w-4 h-4" />
                              </Button>
                            ))}
                            {actions!.viewExternal && (
                              <Button
                                as="a"
                                href={typeof actions!.viewExternal === 'function' ? actions!.viewExternal(row) : actions!.viewExternal}
                                target="_blank"
                                rel="noreferrer"
                                variant="ghost"
                                size="icon"
                                title="View"
                                className="text-muted-foreground hover:text-primary hover:bg-primary/8"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            {actions!.view && (
                              <Button
                                as={Link}
                                to={typeof actions!.view === 'function' ? actions!.view(row) : actions!.view}
                                variant="ghost"
                                size="icon"
                                title="View"
                                className="text-muted-foreground hover:text-primary hover:bg-primary/8"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            {actions!.edit && (
                              <Button
                                as={Link}
                                to={typeof actions!.edit === 'function' ? actions!.edit(row) : actions!.edit}
                                variant="ghost"
                                size="icon"
                                title="Edit"
                                className="text-muted-foreground hover:text-primary hover:bg-primary/8"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )}
                            {actions!.onDelete && (
                              <Button
                                onClick={() => actions!.onDelete!(row)}
                                variant="ghost"
                                size="icon"
                                title="Delete"
                                className="text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={colCount} className="p-16 text-center">
                    {EmptyIcon && (
                      <div className="w-14 h-14 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <EmptyIcon className="w-7 h-7 text-muted-foreground/30" />
                      </div>
                    )}
                    <p className="font-bold text-foreground mb-1">
                      {search ? 'No results found' : emptyTitle}
                    </p>
                    <p className="text-sm text-muted-foreground font-medium">
                      {search ? `No records match "${search}"` : emptyMessage}
                    </p>
                    {search && (
                      <Button
                        onClick={() => setSearch('')}
                        variant="ghost"
                        size="sm"
                        className="mt-3 text-primary hover:underline font-bold"
                      >
                        Clear search
                      </Button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer: count + pagination ── */}
      {!loading && sorted.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-bold text-muted-foreground">
            Showing {startRow}–{endRow} of {sorted.length} records
            {sorted.length !== data.length && (
              <span className="text-muted-foreground/60"> (filtered from {data.length})</span>
            )}
          </p>

          <div className="flex items-center gap-1">
            <Button
              onClick={() => setPage(1)}
              disabled={page === 1}
              variant="ghost"
              size="icon"
              title="First page"
              className="text-muted-foreground"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="ghost"
              size="icon"
              title="Previous page"
              className="text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {getPageNumbers(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1.5 text-muted-foreground text-xs select-none">
                  ···
                </span>
              ) : (
                <Button
                  key={p}
                  onClick={() => setPage(p as number)}
                  variant={page === p ? 'primary' : 'ghost'}
                  size="icon"
                  className={cn(
                    "w-8 h-8 font-bold",
                    page === p ? "shadow-sm" : "text-muted-foreground"
                  )}
                >
                  {p}
                </Button>
              )
            )}

            <Button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="ghost"
              size="icon"
              title="Next page"
              className="text-muted-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              variant="ghost"
              size="icon"
              title="Last page"
              className="text-muted-foreground"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
