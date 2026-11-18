import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store-context";
import QueryProvider from "@/components/providers/QueryProvider";

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins"
});

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
    <html lang="pt-BR" className={poppins.variable}>
      <body className={poppins.className}>
        <StoreProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
