import { Link, NavLink, Outlet, useParams } from 'react-router-dom';

const SECTIONS: { to: string; label: string; end?: boolean }[] = [
  { to: '', label: '仪表盘', end: true },
  { to: 'blueprint', label: '蓝图' },
  { to: 'world', label: '世界三件套' },
  { to: 'characters', label: '角色' },
  { to: 'outline', label: '大纲' },
  { to: 'build/world', label: '▶ 建世界' },
];

const FUTURE = ['章节', '审稿', '记忆', '素材库'];

export function BookLayout() {
  const { id = '' } = useParams();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white p-4">
        <Link to="/" className="mb-4 block text-xs text-zinc-400 hover:text-zinc-700">
          ← 书库
        </Link>
        <div className="mb-3 truncate font-mono text-sm font-semibold">{id}</div>
        <nav className="flex flex-col gap-1">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.to}
              to={s.to ? `/books/${id}/${s.to}` : `/books/${id}`}
              end={s.end}
              className={({ isActive }) =>
                `rounded px-2 py-1.5 text-sm ${
                  isActive ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                }`
              }
            >
              {s.label}
            </NavLink>
          ))}
          <div className="mt-3 px-2 text-[11px] uppercase tracking-wide text-zinc-300">
            即将（alpha-2d）
          </div>
          {FUTURE.map((f) => (
            <span key={f} className="cursor-not-allowed rounded px-2 py-1.5 text-sm text-zinc-300">
              {f}
            </span>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
