import { Menu, LogOut, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";

export default function Navbar({ toggleSidebar }) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      
      <div className="flex items-center">
        {/* Mobile Menu Toggle */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded hover:bg-gray-700 mr-3"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>

        {/* Logo - visible on mobile, hidden on desktop (since sidebar shows it) */}
        <Link to="/dashboard" className="md:hidden">
          <img 
            src="/logo.png" 
            alt="TrapMap" 
            className="h-10 w-auto"
          />
        </Link>

        {/* Desktop Title */}
        <h1 className="hidden md:block ml-4 text-xl font-semibold tracking-wide text-white">
          Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-4 text-white">
        {user && (
          <div className="hidden sm:flex items-center gap-2">
            <User className="w-5 h-5 text-gray-300" />
            <span className="text-sm opacity-80">
              {user.first_name} {user.last_name}
            </span>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-sm transition"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}