import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Buy and sell with people near you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable)}
    >
      <body className="min-h-full">
        <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
          {/* Mobile: `contents` lets the header bar stick to the viewport.
              Desktop: a sticky left rail with the brand + categories. */}
          <div className="max-md:contents md:sticky md:top-0 md:h-dvh md:overflow-y-auto">
            <Header />
            <Sidebar className="hidden md:block" />
          </div>
          <main className="min-w-0 p-4 md:p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
