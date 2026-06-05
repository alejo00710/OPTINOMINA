"use client";
 
import { 
  LayoutDashboard, 
  Settings, 
  Package, 
  ChevronLeft, 
  ChevronRight, 
  LogOut,
  ChevronDown,
  Truck,
  Hammer,
  BarChart3,
  History,
  Calendar,
  Coins
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
 
const menuItems = [
  { name: "Portal (Inactivo)", icon: <LayoutDashboard size={20} />, path: "/", disabled: true },
  { name: "Programación (Inactivo)", icon: <Calendar size={20} />, path: "/produccion/programacion", disabled: true },
  { name: "Planta (Inactivo)", icon: <Hammer size={20} />, path: "/produccion", disabled: true },
  { name: "Métricas KPI (Inactivo)", icon: <BarChart3 size={20} />, path: "/produccion/kpis", disabled: true },
  { name: "Historial (Inactivo)", icon: <History size={20} />, path: "/produccion/terminadas", disabled: true },
  { name: "Gastos (Inactivo)", icon: <BarChart3 size={20} />, path: "/gastos", disabled: true },
  { name: "Logística (Inactivo)", icon: <Truck size={20} />, path: "/logistica", disabled: true },
  { name: "Nómina", icon: <Coins size={20} />, path: "/nomina", disabled: false },
];
 
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
 
  return (
    <aside 
      className={`relative h-screen flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] bg-white border-r border-slate-100 shadow-sm z-[100] ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      {/* Brand Header */}
      <div className="p-8 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[1.25rem] bg-slate-900 flex items-center justify-center shrink-0 shadow-xl shadow-slate-200">
            <span className="text-white font-black text-2xl tracking-tighter">O</span>
          </div>
          {!collapsed && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <h1 className="font-extrabold text-xl text-slate-900 tracking-tight leading-none">Optimoldes</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 opacity-70">Nómina Standalone</p>
            </div>
          )}
        </div>
      </div>
 
      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path === "/nomina" && pathname === "/");
          
          if (item.disabled) {
            return (
              <div
                key={item.name}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium text-slate-300 cursor-not-allowed select-none"
                title="Módulo no disponible en esta versión independiente de Nómina"
              >
                <div className="shrink-0 opacity-50">
                  {item.icon}
                </div>
                {!collapsed && (
                  <span className="text-sm tracking-tight opacity-50 font-semibold">
                    {item.name.replace(" (Inactivo)", "")}
                  </span>
                )}
                {!collapsed && (
                  <span className="ml-auto text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-md">
                    Lock
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.path}
              className={`stitch-sidebar-item group ${
                isActive 
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className={`shrink-0 transition-all duration-500 ${isActive ? "scale-110" : "group-hover:scale-110 group-hover:rotate-6"}`}>
                {item.icon}
              </div>
              {!collapsed && (
                <span className={`text-sm tracking-tight font-semibold ${isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"}`}>
                  {item.name}
                </span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>
 
      {/* Bottom Actions */}
      <div className="p-6 mt-auto space-y-4">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="w-full h-14 flex items-center justify-center gap-3 rounded-[1.25rem] bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all font-bold text-[10px] uppercase tracking-widest border border-slate-100/50"
        >
          {collapsed ? <ChevronRight size={18} /> : (
            <>
              <ChevronLeft size={18} />
              <span>Colapsar Panel</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
