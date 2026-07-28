import * as React from 'react';
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
    <div className="flex gap-1 p-0.5 rounded-lg bg-[#0C0D14] border border-[#1E2232] w-fit">
      {items.map(item => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`relative px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer select-none ${
              isActive ? 'text-[#F8FAFC]' : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="app-tab-active"
                className="absolute inset-0 bg-[#171A26] rounded-md border border-[#262A3E] -z-1"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-1 flex items-center gap-1.5">
              {item.label}
              {item.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-[#F97316]/15 text-[#F97316] font-semibold'
                      : 'bg-[#181A26] text-[#64748B]'
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
