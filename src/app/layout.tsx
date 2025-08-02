import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clerkk Recorder",
  description: "Record and visualize audio with a beautiful waveform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
