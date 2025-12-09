import { NavLink } from "react-router-dom";

export default function SidebarItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `
        flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300
        hover:bg-gray-700 transition 
        ${isActive ? "bg-gray-700 text-white" : ""}
        `
      }
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </NavLink>
  );
}
