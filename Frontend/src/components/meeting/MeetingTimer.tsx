import { useEffect, useState } from 'react';

interface Props { startedAt?: string; }

export default function MeetingTimer({ startedAt }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const base = Date.now() - new Date(startedAt).getTime();
    setElapsed(Math.floor(base / 1000));
    const id = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const fmt = (n: number) => String(n).padStart(2, '0');

  return (
    <span className="font-mono text-sm text-[var(--app-text-secondary)] tabular-nums">
      {h > 0 ? `${fmt(h)}:` : ''}{fmt(m)}:{fmt(s)}
    </span>
  );
}
