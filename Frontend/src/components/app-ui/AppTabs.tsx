import { motion } from 'framer-motion';

export interface AppTabItem {
  id: string;
  label: string;
  count?: number;
}

export interface AppTabsProps {
  items: AppTabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function AppTabs({ items, activeId, onChange }: AppTabsProps) {
  return (
    <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}>
      {items.map(item => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className="relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none"
            style={{
              color: isActive ? 'var(--app-text-primary)' : 'var(--app-text-muted)'
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--app-text-secondary)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--app-text-muted)';
              }
            }}
          >
            {isActive && (
              <motion.div
                layoutId="app-tab-active"
                className="absolute inset-0 rounded-lg -z-1"
                style={{
                  backgroundColor: 'var(--app-surface-hover)',
                  borderColor: 'var(--app-border)'
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-1 flex items-center gap-1.5">
              {item.label}
              {item.count !== undefined && (
                <span
                  className="text-[10px] px-1.5 py-0.2 rounded-full"
                  style={{
                    backgroundColor: isActive ? 'var(--app-border)' : 'var(--app-surface-subtle)',
                    color: isActive ? 'var(--app-text-primary)' : 'var(--app-text-muted)',
                    fontWeight: isActive ? 600 : 400
                  }}
                >
                  {item.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
