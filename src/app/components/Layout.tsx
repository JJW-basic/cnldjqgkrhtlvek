import { Outlet, useNavigate, useLocation } from "react-router";
import { Heart, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isLogin = location.pathname === "/";

  const handleLogout = () => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("auth_provider");
    navigate("/");
  };

  if (isLogin) return <Outlet />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/services")}>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <span className="text-white text-lg">🏥</span>
            </div>
            <span className="hidden sm:block text-slate-800" style={{ fontSize: "1.1rem", fontWeight: 600 }}>만성질환 예측 AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            {[
              { path: "/services", label: "서비스" },
              { path: "/survey", label: "설문" },
              { path: "/dashboard", label: "대시보드" },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>로그아웃</span>
            </button>
            <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {[
              { path: "/services", label: "서비스" },
              { path: "/survey", label: "설문" },
              { path: "/dashboard", label: "대시보드" },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => { handleLogout(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-lg text-red-500 hover:bg-red-50"
            >
              로그아웃
            </button>
          </div>
        )}
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}