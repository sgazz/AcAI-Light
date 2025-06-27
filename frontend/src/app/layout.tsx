import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorToastProvider } from '../components/ErrorToastProvider';
import { OfflineDetector } from '../components/OfflineDetector';
import { ThemeProvider } from "../components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AcAIA - AI Study Assistant",
  description: "AI-powered study assistant with RAG capabilities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ErrorToastProvider>
            <OfflineDetector />
            {children}
          </ErrorToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
