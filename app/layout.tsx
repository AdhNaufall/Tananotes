import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tananotes - Your Personal Digital Notebook",
  description: "Organize your thoughts and ideas with Tananotes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-[#333333] flex justify-center`}>
        {/* Mobile constrained wrapper */}
        <div className="w-full max-w-[430px] lg:max-w-none min-h-screen bg-[var(--color-bg-cream)] relative overflow-x-hidden shadow-2xl brutalist-border my-0 md:my-4 md:min-h-[90vh] md:max-h-[90vh] lg:max-h-none md:rounded-[40px] lg:rounded-none flex flex-col">
          <DesktopNav />
          <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col pb-24 lg:pb-8">
            {children}
          </div>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
