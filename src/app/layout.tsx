import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store-context";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Artes Design Online",
  description: "Gerenciamento de imagens para clientes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
