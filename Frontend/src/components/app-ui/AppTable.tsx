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
    : 'w-full overflow-x-auto bg-[#141417] border border-[#27272a] rounded-xl';

  const headerTrClasses = isDash
    ? 'border-b border-[#1a1a1e] bg-[#111215] text-[10px] font-mono uppercase tracking-wider text-[#52525b]'
    : 'border-b border-[#1a1a1e] bg-[#111215] text-[10px] font-mono uppercase tracking-wider text-[#52525b]';

  const tbodyClasses = isDash
    ? 'divide-y divide-[#1a1a1e] text-[13px] text-[#a1a1aa]'
    : 'divide-y divide-[#1a1a1e] text-[13px] text-[#a1a1aa]';

  const rowHover = isDash
    ? 'transition-colors hover:bg-[#1c1c21] hover:text-[#f4f4f5]'
    : 'transition-colors hover:bg-[#1c1c21]';

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
              <td colSpan={columns.length} className="px-4 py-10 text-center text-[#52525b]">
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
