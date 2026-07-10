import type { Metadata } from "next";
import "./globals.css";
import "aos/dist/aos.css";
import { StaffProfileProvider } from "@/lib/StaffProfileContext";
import AosInitializer from "@/components/AosInitializer";

export const metadata: Metadata = {
  title: "Aura Crib — Staff CMS",
  description: "Staff dashboard for Aura Crib: bookings, calendar, property content, and housekeeping.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try { const savedTheme = localStorage.getItem("aura-crib-theme"); const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches; document.documentElement.classList.toggle("dark", savedTheme ? savedTheme === "dark" : prefersDark); } catch {}`,
          }}
        />
      </head>
      <body>
        <StaffProfileProvider>
          <AosInitializer />
          {children}
        </StaffProfileProvider>
      </body>
    </html>
  );
}
