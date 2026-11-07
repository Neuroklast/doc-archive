import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOC ARCHIVE",
  description: "Privates Dokumentenarchiv mit Google Drive",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
