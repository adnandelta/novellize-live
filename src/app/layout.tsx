import type { Metadata } from "next";
import { Merriweather } from "next/font/google";
import "./globals.css";
import { AuthProvider } from './authcontext'
import { ThemeProvider } from 'next-themes'
import { Analytics } from '@vercel/analytics/react'

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-merriweather",
});

export const metadata: Metadata = {
  title: "Novellize - Discover Your Next Adventure",
  description: "Explore thousands of light novels across various genres",
  icons: {
    icon: './assets/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${merriweather.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
