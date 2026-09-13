import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Pupify — Gestão para Clínicas Veterinárias",
  description:
    "Plataforma completa para gestão de clínicas veterinárias: pacientes, agenda, prontuários inteligentes com IA e muito mais.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background" suppressHydrationWarning>
      <body className={`${jakartaSans.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={true}
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
