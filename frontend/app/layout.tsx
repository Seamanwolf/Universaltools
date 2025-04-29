import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'UniversalTools.pro - Многофункциональный сервис для работы с файлами',
  description: 'Сервис для скачивания видео с YouTube, TikTok, конвертации файлов и работы с PDF в высоком качестве',
  icons: {
    icon: [
      {
        url: '/icons/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/favicon.ico',
        sizes: '32x32',
      },
    ],
    apple: {
      url: '/icons/favicon.svg',
      type: 'image/svg+xml',
    },
  },
  manifest: '/manifest.json',
  themeColor: '#1890FF',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/favicon.svg" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ConfigProvider locale={ruRU}>
            <AuthProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </AuthProvider>
          </ConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 