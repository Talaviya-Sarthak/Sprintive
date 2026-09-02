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
}: AppTableProps<T>) {
  const containerStyle: React.CSSProperties = {
    width: '100%',
    overflowX: 'auto',
    backgroundColor: 'var(--app-surface-card)',
    borderColor: 'var(--app-border)',
    borderRadius: '0.75rem'
  };

  const headerTrStyle: React.CSSProperties = {
    borderBottom: '1px solid var(--app-border-subtle)',
    backgroundColor: 'var(--app-surface-subtle)',
    fontSize: '10px',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--app-text-muted)'
  };

  return (
    <div style={containerStyle}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr style={headerTrStyle}>
            {columns.map(col => (
              <th key={col.key} className={`px-4 py-3 font-semibold ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ color: 'var(--app-text-secondary)' }}>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center" style={{ color: 'var(--app-text-muted)' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(item => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                style={{ borderBottom: '1px solid var(--app-border-subtle)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
                  e.currentTarget.style.color = 'var(--app-text-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--app-text-secondary)';
                }}
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
