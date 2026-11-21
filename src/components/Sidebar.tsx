'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, CheckSquare, FolderOpen } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const items = [
    { name: 'My day', href: '/', icon: Sun },
    { name: 'My plan', href: '/tasks', icon: CheckSquare },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
  ];

  return (
    <nav aria-label="Main navigation" className="order-3 basis-full sm:order-none sm:basis-auto sm:flex-1">
      <ul className="grid grid-cols-3 gap-1 sm:flex sm:justify-center sm:gap-2">
        {items.map(({ name, href, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return <li key={href}>
            <Link href={href} aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{name}
            </Link>
          </li>;
        })}
      </ul>
    </nav>
  );
}
