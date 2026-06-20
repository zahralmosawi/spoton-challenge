'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken } from '@/lib/api';

export default function PmLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">SpotOn Project Engine</div>
        <nav className="nav">
          <Link href="/pm/it-workspace">IT Workspace</Link>
          <Link href="/pm/releases">Releases</Link>
          <Link href="/pm/score">Score</Link>
          <button
            onClick={() => {
              clearToken();
              router.push('/login');
            }}
          >
            Logout
          </button>
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
