// app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import MainLayout from "./components/layout/MainLayout";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Department of BBA",
  description:
    "This is the page of Department of BBA of Adamjee Cantonment College",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* pb-16 prevents the bottom nav from covering content on mobile */}
      <body className="min-h-screen bg-gray-50 pb-16 sm:pb-0">
        <AuthProvider>
          <MainLayout>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: { background: "#333", color: "#fff" },
              }}
            />
          </MainLayout>
        </AuthProvider>
      </body>
    </html>
  );
}