import { NavLink } from "react-router-dom";

export default function SidebarItem({ icon: Icon, label, to, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 p-3 rounded-lg transition-colors 
        ${isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"}`
      }
    >
      <Icon className="w-5 h-5" />
      {!collapsed && <span className="whitespace-nowrap">{label}</span>}
    </NavLink>
  );
}
