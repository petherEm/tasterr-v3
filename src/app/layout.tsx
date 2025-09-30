import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalNavbar } from "@/components/shared/conditional-navbar";
import { ConditionalFooter } from "@/components/shared/conditional-footer";
import { ClerkProvider } from "@clerk/nextjs";
import { plPL } from "@clerk/localizations";
import { dark } from "@clerk/themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "You shape FMCG future!",
  description:
    "Welcome to Tasterr, the ultimate platform for discovering and sharing your favorite food and beverage products. Join our community of passionate foodies and help shape the future of FMCG by providing valuable feedback to brands and manufacturers. Whether you're a fan of snacks, drinks, or gourmet treats, Tasterr is the perfect place to explore new flavors, connect with like-minded individuals, and make your voice heard. Sign up today and start tasting the future!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={plPL}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#94B2F9',
          colorBackground: '#000000',
          colorInputBackground: '#1a1a1a',
          colorInputText: '#ffffff',
          fontFamily: 'var(--font-geist-sans)',
          borderRadius: '0.75rem',
          colorText: '#ffffff',
          colorTextSecondary: '#9ca3af',
        },
        elements: {
          card: 'bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-white/20 shadow-2xl',
          headerTitle: 'text-white font-black text-2xl',
          headerSubtitle: 'text-gray-300',
          socialButtonsBlockButton: 'bg-gray-800/50 border border-white/10 hover:bg-gray-700/50 text-white',
          formButtonPrimary: 'bg-gradient-to-r from-[#94B2F9] to-[#7A9EF8] hover:from-[#7A9EF8] hover:to-[#6A8EE8] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200',
          formFieldInput: 'bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500',
          formFieldLabel: 'text-gray-300 font-medium',
          footerActionLink: 'text-[#94B2F9] hover:text-[#7A9EF8]',
          identityPreviewText: 'text-white',
          identityPreviewEditButton: 'text-[#94B2F9] hover:text-[#7A9EF8]',
          formFieldInputShowPasswordButton: 'text-gray-400 hover:text-white',
          dividerLine: 'bg-white/10',
          dividerText: 'text-gray-400',
          footerActionText: 'text-gray-400',
          otpCodeFieldInput: 'bg-gray-800/50 border-white/10 text-white',
          formResendCodeLink: 'text-[#94B2F9] hover:text-[#7A9EF8]',
          alertText: 'text-gray-300',
          formFieldErrorText: 'text-red-400',
        },
      }}
    >
      <html lang="pl">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ConditionalNavbar />
          {children}
          <ConditionalFooter />
        </body>
      </html>
    </ClerkProvider>
  );
}
