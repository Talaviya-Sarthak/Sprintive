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
}

export function AppTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No items found',
  onRowClick,
}: AppTableProps<T>) {
  return (
    <div className="w-full overflow-x-auto bg-[#11131C] border border-[#1E2232] rounded-xl shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#181A26] bg-[#0C0D14]/80 text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
            {columns.map(col => (
              <th key={col.key} className={`px-4 py-2.5 font-semibold ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#181A26] text-xs text-[#CBD5E1]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[#64748B]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(item => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={`transition-colors hover:bg-[#171A26] ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
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
