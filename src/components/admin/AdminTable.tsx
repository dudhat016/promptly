import type { LucideIcon } from 'lucide-react';

export interface AdminTableColumn<T> {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyMessage?: string;
}

export default function AdminTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 5,
  emptyIcon: EmptyIcon,
  emptyTitle = 'No records found',
  emptyMessage = 'Records will appear here once available.',
}: AdminTableProps<T>) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="thead-row">
              {columns.map((col) => (
                <th key={col.key} className={`th ${col.className ?? ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="tr">
                  {columns.map((col) => (
                    <td key={col.key} className="td">
                      <div className="h-4 bg-muted/60 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((row) => (
                <tr key={rowKey(row)} className="tr">
                  {columns.map((col) => (
                    <td key={col.key} className={`td ${col.className ?? ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-16 text-center">
                  {EmptyIcon && (
                    <div className="w-14 h-14 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <EmptyIcon className="w-7 h-7 text-muted-foreground/30" />
                    </div>
                  )}
                  <p className="font-bold text-foreground mb-1">{emptyTitle}</p>
                  <p className="text-sm text-muted-foreground font-medium">{emptyMessage}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
