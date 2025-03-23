import "@/styles/globals.css";
import clsx from "clsx";
import { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { Fira_Code as FontMono, Inter as FontSans } from "next/font/google";

// Basado en la web logicoycreativo.com, 
// la paleta principal (aprox) es #212121 (fondo oscuro) y toques en naranja (#ff6600) y blanco.
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Asistente Interactivo - Lógico y Creativo",
    template: `%s - Lógico y Creativo`,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      lang="es"
      className={`${fontSans.variable} ${fontMono.variable} font-sans`}
    >
      <head />
      <body
        className={clsx(
          "min-h-screen",
          "antialiased",
          "bg-[#212121]", // fondo oscuro
          "text-white" // texto en blanco
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <main className="h-screen w-screen flex flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
