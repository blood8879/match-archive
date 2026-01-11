import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas-900">
      <Header />
      <main className="pb-20 pt-4 md:pb-8 md:pt-20">
        <div className="mx-auto max-w-7xl px-4">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
