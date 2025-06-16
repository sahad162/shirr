import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  BarChart,
  Users,
  Stethoscope,
  Download as DownloadIcon,
  Bell,
  HelpCircle,
  Settings,
  LogOut,
} from "lucide-react";

const mainNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Upload Report", icon: UploadCloud, path: "/report" },
  { label: "View Reports", icon: FileText, path: "/view" },
  { label: "Analytics", icon: BarChart, path: "/analytics" },
  { label: "Patients", icon: Users, path: "/patients" },
  { label: "Doctors", icon: Stethoscope, path: "/doctors" },
  { label: "Download Center", icon: DownloadIcon, path: "/downloads" },
];

export default function Sidenav() {
  return (
    <aside className="fixed top-0 left-0 w-60 h-screen bg-gray-300 shadow-sm flex flex-col justify-between">

      <div>
        <div className="p-6 font-[poppins] text-center">
          <h1 className="text-6xl font-bold text-gray-900">Shirr</h1>
          <h3 className="font-medium">Pharma</h3>
        </div>

        <hr className="border-b border-gray-500 mx-auto opacity-50 w-60" />

        <nav className="p-6 space-y-2 flex flex-col">
          {mainNav.map(({ label, icon: Icon, path, end }) => (
            <NavLink
              key={label}
              to={path}
              end={end}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2 rounded-r-lg transition',
                  isActive
                    ? 'bg-gray-100 border-l-4 border-black text-gray-900 font-semibold'
                    : 'text-gray-700 hover:bg-gray-200',
                ].join(' ')
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

    
      <div className="p-6 space-y-2 flex flex-col">
        <NavLink
          to="/settings"
          end
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-3 py-2 rounded-r-lg transition',
              isActive
                ? 'bg-gray-100 border-l-4 border-black text-gray-900 font-semibold'
                : 'text-gray-700 hover:bg-gray-200',
            ].join(' ')
          }
        >
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>

        <NavLink
          to="/help"
          end
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-3 py-2 rounded-r-lg transition',
              isActive
                ? 'bg-gray-100 border-l-4 border-black text-gray-900 font-semibold'
                : 'text-gray-700 hover:bg-gray-200',
            ].join(' ')
          }
        >
          <HelpCircle size={20} />
          <span>Help</span>
        </NavLink>

        <button
          onClick={() => {
           
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
