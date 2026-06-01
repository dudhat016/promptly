import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import Select from '../primitives/Select';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  showPageSizeSelector?: boolean;
  showItemCount?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

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

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 10,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onPageSizeChange,
  showPageSizeSelector = false,
  showItemCount = true,
  className,
  size = 'md',
}: PaginationProps) {
  const pageNumbers = getPageNumbers(page, totalPages);
  const isSm = size === 'sm';

  const btnBase = cn(
    'inline-flex items-center justify-center rounded-lg border border-border font-semibold transition-all',
    isSm ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'
  );

  const fromItem = totalItems ? (page - 1) * pageSize + 1 : null;
  const toItem   = totalItems ? Math.min(page * pageSize, totalItems) : null;

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      {/* Item count */}
      {showItemCount && totalItems !== undefined && (
        <p className="text-xs text-muted-foreground shrink-0">
          {fromItem}–{toItem} of <span className="font-semibold text-foreground">{totalItems.toLocaleString()}</span>
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Page size selector */}
        {showPageSizeSelector && onPageSizeChange && (
          <Select
            value={String(pageSize)}
            onChange={val => onPageSizeChange(Number(val))}
            options={pageSizeOptions.map(n => ({ value: String(n), label: `${n} / page` }))}
            className="w-28"
            isSearchable={false}
          />
        )}

        {/* First */}
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className={cn(btnBase, page === 1 ? 'text-muted-foreground/40 bg-muted/30 cursor-not-allowed' : 'text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5')}
          aria-label="First page"
        >
          <ChevronsLeft className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>

        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={cn(btnBase, page === 1 ? 'text-muted-foreground/40 bg-muted/30 cursor-not-allowed' : 'text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5')}
          aria-label="Previous page"
        >
          <ChevronLeft className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((n, i) =>
          n === '...' ? (
            <span key={`ellipsis-${i}`} className={cn('inline-flex items-end justify-center pb-1 text-muted-foreground', isSm ? 'w-7 text-xs' : 'w-9 text-sm')}>
              ···
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onPageChange(n as number)}
              className={cn(
                btnBase,
                n === page
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5'
              )}
              aria-label={`Page ${n}`}
              aria-current={n === page ? 'page' : undefined}
            >
              {n}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={cn(btnBase, page === totalPages ? 'text-muted-foreground/40 bg-muted/30 cursor-not-allowed' : 'text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5')}
          aria-label="Next page"
        >
          <ChevronRight className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>

        {/* Last */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className={cn(btnBase, page === totalPages ? 'text-muted-foreground/40 bg-muted/30 cursor-not-allowed' : 'text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5')}
          aria-label="Last page"
        >
          <ChevronsRight className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>
      </div>
    </div>
  );
}
