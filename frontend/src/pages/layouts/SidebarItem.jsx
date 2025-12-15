import { NavLink } from "react-router-dom";

export default function SidebarItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `
        flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 dark:text-gray-400
        hover:bg-gray-700 dark:hover:bg-gray-800 transition 
        ${isActive ? "bg-gray-700 dark:bg-gray-800 text-white dark:text-gray-100" : ""}
        `
      }
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </NavLink>
  );
}
