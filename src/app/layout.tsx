import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreamFlow — Video Processing SaaS",
  description: "Event-driven serverless video processing platform. Upload, transcode, and deliver videos globally with AWS infrastructure.",
  keywords: ["video processing", "SaaS", "AWS", "serverless", "HLS", "streaming"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
