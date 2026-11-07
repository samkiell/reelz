import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Reelz — Free, Self-Hosted YouTube Shorts Studio",
  description: "AI scripts, local Kokoro voiceovers, kinetic captions, and automated 1080x1920 MP4 video generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0A0D14] text-[#F1F5F9] min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

