"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "홈", icon: Home },
  { href: "/teams", label: "팀", icon: Users },
  { href: "/matches", label: "경기", icon: Calendar },
  { href: "/profile", label: "내 정보", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[var(--surface-800)]/95 backdrop-blur-sm md:hidden">
      <ul className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-[56px] flex-col items-center justify-center gap-1 px-4 py-3 transition-colors active:scale-98",
                    isActive ? "text-[var(--primary)]" : "text-[var(--text-400)] hover:text-white"
                  )}
                >
                <item.icon className="h-6 w-6" />
                <span className="text-xs">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
