import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { SwRegister } from "@/components/sw-register";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: 'Procesamiento Digital de Imágenes',
  description: 'Visor de Presentaciones para Procesamiento Digital de Imágenes',
  openGraph: {
    title: 'Procesamiento Digital de Imágenes',
    description: 'Visor de Presentaciones para Procesamiento Digital de Imágenes',
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Procesamiento Digital de Imágenes',
    description: 'Visor de Presentaciones para Procesamiento Digital de Imágenes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
