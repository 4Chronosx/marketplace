import { Brand } from "@/components/layout/header";

// Focus shell for item detail and listing creation: just the brand at the
// top-left, no category rail (matches the mockups).
export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="px-4 pt-4 md:px-6 md:pt-6">
        <Brand className="md:flex-col md:items-start md:gap-1" />
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 md:px-6 md:pt-6">
        {children}
      </main>
    </div>
  );
}
