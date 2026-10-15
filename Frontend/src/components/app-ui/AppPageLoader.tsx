export interface AppPageLoaderProps {
  label?: string;
}

export function AppPageLoader({ label }: AppPageLoaderProps) {
  return (
    <div className="flex-1 w-full min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="relative flex items-center justify-center">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{
            borderColor: 'var(--app-border)',
            borderTopColor: 'var(--app-text-primary)',
          }}
        />
      </div>
      {label && (
        <p className="text-xs font-medium mt-3" style={{ color: 'var(--app-text-muted)' }}>
          {label}
        </p>
      )}
    </div>
  );
}
