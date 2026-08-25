import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import SearchBar from "../SearchBar.jsx";
import { MenuIcon } from "../icons.jsx";

export default function Topbar({ onOpenSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search results only ever render on Dashboard.jsx — "q" is meaningless
  // on any other route. Track the input locally so typing feels responsive
  // even while jumping there, and mirror it from the URL only on /dashboard.
  const urlQuery = location.pathname === "/dashboard" ? searchParams.get("q") || "" : "";
  const [inputValue, setInputValue] = useState(urlQuery);

  useEffect(() => {
    setInputValue(urlQuery);
  }, [urlQuery]);

  const handleChange = (value) => {
    setInputValue(value);

    if (location.pathname === "/dashboard") {
      const next = new URLSearchParams(searchParams);
      if (value) next.set("q", value);
      else next.delete("q");
      setSearchParams(next, { replace: true });
      return;
    }

    // Typing a search query from any other page (a note's detail page,
    // /architecture, /settings) used to silently update that page's own
    // URL with no visible effect, since nothing there reads "q". Jump to
    // the dashboard instead so a search always actually shows something.
    if (value) navigate(`/dashboard?q=${encodeURIComponent(value)}`);
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-glass-border bg-app px-4 py-3 sm:px-6 lg:border-none">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open menu"
        className="rounded-lg p-1.5 text-ink hover:bg-primary-light lg:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      <div className="max-w-md flex-1">
        <SearchBar value={inputValue} onChange={handleChange} />
      </div>
    </header>
  );
}
