// For adding custom fonts with other frameworks, see:
// https://tailwindcss.com/docs/font-family
import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import AppShell from "./app-shell";
import ClerkDevWarningFilter from "./clerk-dev-warning-filter";
import "./globals.css";


const faviconPath =
  "/ChatGPT_Image_Jun_24__2026__09_23_54_PM-removebg-preview.ico";

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "coredesk",
  description: "Coredesk — wallet, stats, todo, notes, and links in one place.",
  icons: {
    icon: faviconPath,
    shortcut: faviconPath,
    apple: faviconPath,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${fontSans.variable} antialiased`}>
        <ClerkProvider>
          <ClerkDevWarningFilter />
          <AppShell>{children}</AppShell>
          <Toaster richColors position="top-right" />
        </ClerkProvider>
      </body>
    </html>
  );
}