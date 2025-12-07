import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const { pathname } = useLocation();
  return (
    <header className="border-b">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold">
          Airtable Forms
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link
            className={pathname.startsWith("/dashboard") ? "font-medium" : ""}
            to="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className={pathname.startsWith("/builder") ? "font-medium" : ""}
            to="/builder"
          >
            Builder
          </Link>
        </nav>
      </div>
    </header>
  );
}
