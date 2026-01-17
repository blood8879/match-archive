"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, Calendar, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "홈", icon: Home },
  { href: "/teams", label: "팀", icon: Users },
  { href: "/matches", label: "경기", icon: Calendar },
  { href: "/profile", label: "내 정보", icon: User },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 hidden border-b border-white/5 bg-[var(--surface-800)]/95 backdrop-blur-sm md:block">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/dashboard" className="text-xl font-bold text-[var(--primary)]">
          Match Archive
        </Link>
        <nav>
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 transition-colors",
                      isActive
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-[var(--text-400)] hover:bg-[var(--surface-700)] hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </header>
  );
}
