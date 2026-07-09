import type { Metadata } from "next";
import "./globals.css";
import { StaffProfileProvider } from "@/lib/StaffProfileContext";

export const metadata: Metadata = {
  title: "Aura Crib — Staff CMS",
  description: "Staff dashboard for Aura Crib: bookings, calendar, property content, and housekeeping.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StaffProfileProvider>{children}</StaffProfileProvider>
      </body>
    </html>
  );
}
