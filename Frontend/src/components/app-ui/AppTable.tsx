import * as React from 'react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface AppTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  variant?: 'default' | 'dashboard';
}

export function AppTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No items found',
  onRowClick,
  variant = 'default',
}: AppTableProps<T>) {
  const isDash = variant === 'dashboard';

  const containerClasses = isDash
    ? 'w-full overflow-x-auto bg-[#141417] border border-[#27272a] rounded-xl'
    : 'w-full overflow-x-auto bg-[#11131C] border border-[#1E2232] rounded-xl shadow-sm';

  const headerTrClasses = isDash
    ? 'border-b border-[#1f1f23] bg-[#121215] text-[10px] font-mono uppercase tracking-wider text-[#71717a]'
    : 'border-b border-[#181A26] bg-[#0C0D14]/80 text-[10px] font-mono uppercase tracking-wider text-[#64748B]';

  const tbodyClasses = isDash
    ? 'divide-y divide-[#1f1f23] text-xs text-[#a1a1aa]'
    : 'divide-y divide-[#181A26] text-xs text-[#CBD5E1]';

  const rowHover = isDash
    ? 'transition-colors hover:bg-[#18181b] hover:text-[#f4f4f5]'
    : 'transition-colors hover:bg-[#171A26]';

  return (
    <div className={containerClasses}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className={headerTrClasses}>
            {columns.map(col => (
              <th key={col.key} className={`px-4 py-3 font-semibold ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={tbodyClasses}>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[#71717a]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(item => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={`${rowHover} ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3.5 ${col.className ?? ''}`}>
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
