import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BackgroundEffect } from "@/components/wellness/BackgroundEffect";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Social Echelon",
  description: "AI-powered talent management platform for micro-influencers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <BackgroundEffect />
        {children}
      </body>
    </html>
  );
}
