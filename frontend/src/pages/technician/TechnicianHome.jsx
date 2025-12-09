import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";
import { FiMap, FiBox, FiCamera, FiClock, FiList, FiClipboard } from "react-icons/fi";

export default function TechnicianHome() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto p-4">

      {/* Begrüßung */}
      <h1 className="text-2xl font-bold mb-2">
        Hallo {user?.email || "Techniker"},
      </h1>

      <p className="text-gray-500 dark:text-gray-300 mb-6">
        Was möchtest du heute erledigen?
      </p>

      {/* GRID MIT MODULEN */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

        {/* Objekte */}
        <Link
          to="/tech/objects"
          className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-5 flex flex-col items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <FiList className="text-3xl mb-2" />
          <span className="font-medium">Objekte</span>
        </Link>

        {/* Layouts */}
        <Link
          to="/tech/layouts"
          className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-5 flex flex-col items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <FiMap className="text-3xl mb-2" />
          <span className="font-medium">Layouts / Karten</span>
        </Link>

        {/* Boxen */}
        <Link
          to="/tech/boxes"
          className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-5 flex flex-col items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <FiBox className="text-3xl mb-2" />
          <span className="font-medium">Boxen</span>
        </Link>

        {/* QR-Scan */}
        <Link
          to="/tech/scan"
          className="bg-blue-600 text-white rounded-xl p-5 flex flex-col items-center hover:bg-blue-700 transition shadow-md"
        >
          <FiCamera className="text-3xl mb-2" />
          <span className="font-medium">QR-Scan starten</span>
        </Link>

        {/* Verlauf */}
        <Link
          to="/tech/history"
          className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-5 flex flex-col items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <FiClock className="text-3xl mb-2" />
          <span className="font-medium">Verlauf</span>
        </Link>

        {/* Später Einsätze / Touren */}
        <Link
          to="/tech/jobs"
          className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-5 flex flex-col items-center opacity-50 cursor-not-allowed"
        >
          <FiClipboard className="text-3xl mb-2" />
          <span className="font-medium">Einsätze (bald)</span>
        </Link>

      </div>
    </div>
  );
}
