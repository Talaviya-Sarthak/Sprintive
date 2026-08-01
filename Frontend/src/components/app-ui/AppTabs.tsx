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
    <div className="flex gap-1 p-1 rounded-xl bg-[#141417] border border-[#27272a] w-fit">
      {items.map(item => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none ${
              isActive ? 'text-[#f4f4f5]' : 'text-[#71717a] hover:text-[#a1a1aa]'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="app-tab-active"
                className="absolute inset-0 bg-[#1c1c21] rounded-lg border border-[#27272a] -z-1"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-1 flex items-center gap-1.5">
              {item.label}
              {item.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-[#27272a] text-[#f4f4f5] font-semibold'
                      : 'bg-[#18181b] text-[#71717a]'
                  }`}
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
