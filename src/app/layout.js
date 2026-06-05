import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Optimoldes Nómina | Independiente",
  description: "Sistema independiente de nómina y gestión de asistencia de OPTIMOLDES S.A.S.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased bg-white`}>
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 overflow-hidden`}>
        <div className="flex h-screen overflow-hidden bg-slate-50">
          <Sidebar />
          <main className="flex-1 p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
