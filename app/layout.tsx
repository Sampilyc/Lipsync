import "@/styles/globals.css";
import clsx from "clsx";
import { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { Fira_Code as FontMono, Inter as FontSans } from "next/font/google";

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
    default: "Asistente Interactivo",
    template: `%s - Asistente Interactivo`,
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
      <body className={clsx("min-h-screen bg-black antialiased")}>
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <main className="h-screen w-screen flex flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
