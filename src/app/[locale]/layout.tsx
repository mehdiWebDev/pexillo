import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/src/i18n/routing';
import { ThemeProvider } from "next-themes";
import { ReduxProvider } from "@/src/providers/ReduxProvider";
import { ReactQueryProvider } from "@/src/providers/ReactQueryProvider";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ClientNavigationMenu } from "@/src/components/nav-menu";
import { AuthButton } from "@/src/components/auth-button";
import { Geist, Geist_Mono } from "next/font/google";
import Footer from "@/src/components/footer";

const defaultUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Generate static params for all locales
export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

// Generate metadata for each locale - params needs to be awaited here too
export async function generateMetadata({
    params
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params; // Await params here
    const t = await getTranslations({ locale, namespace: 'metadata' });

    return {
        metadataBase: new URL(defaultUrl),
        title: t('title') || "Next.js and Supabase Starter Kit",
        description: t('description') || "The fastest way to build apps with Next.js and Supabase",
    };
}

// Main locale layout - params is now a Promise
export default async function LocaleLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>; // params is a Promise
}) {
    // Await params to get the locale
    const { locale } = await params;

    // Ensure that the incoming locale is valid
    if (!(routing.locales as readonly string[]).includes(locale)) {
        notFound();
    }

    // Get all messages for the locale
    const messages = await getMessages({ locale });

    return (
        <html lang={locale} suppressHydrationWarning>
            <body className={`${geistSans.className} ${geistMono.className} antialiased`}>
                <ReduxProvider>
                    <ReactQueryProvider>
                        <ThemeProvider
                            attribute="class"
                            defaultTheme="system"
                            enableSystem
                            disableTransitionOnChange
                        >
                            <NextIntlClientProvider messages={messages} locale={locale}>
                                <ClientNavigationMenu>
                                    <AuthButton />
                                </ClientNavigationMenu>
                                {children}
                                <Footer />
                            </NextIntlClientProvider>
                        </ThemeProvider>
                        <ReactQueryDevtools />
                    </ReactQueryProvider>
                </ReduxProvider>
            </body>
        </html>
    );
}