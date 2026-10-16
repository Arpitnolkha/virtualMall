import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/shopping/CartProvider";
export const metadata: Metadata = {
  title: "Maya’s • The everyday store",
  description:
    "Explore a little store full of everyday discoveries. A 3D shopping demo with Maya.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
