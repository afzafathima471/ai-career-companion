import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [active, setActive] = useState("Dashboard");

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div className="flex bg-paper">
      <Sidebar active={active} onNavigate={setActive} />
      <main className="flex-1">
        <Topbar title={active} />
        {active === "Dashboard" ? (
          <Dashboard />
        ) : (
          <div className="px-10 py-8 text-ink/50">
            {active} page — build this next.
          </div>
        )}
      </main>
    </div>
  );
}
