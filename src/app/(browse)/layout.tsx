import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

// Browsing shell: brand + category rail on the left, content on the right.
export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      {/* Mobile: `contents` lets the header bar stick to the viewport.
          Desktop: a sticky left rail with the brand + categories. */}
      <div className="max-md:contents md:sticky md:top-0 md:h-dvh md:overflow-y-auto">
        <Header />
        <Sidebar className="hidden md:block" />
      </div>
      <main className="min-w-0 p-4 md:p-6">{children}</main>
    </div>
  );
}
