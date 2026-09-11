import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import Resume from "./pages/Resume";
import Internships from "./pages/Internships";
import Interview from "./pages/Interview";
import Applications from "./pages/Applications";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Login from "./pages/Login";

const pages = {
  Dashboard,
  Resume,
  Internships,
  Interview,
  Applications,
  Settings,
  Help,
};

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [active, setActive] = useState("Dashboard");

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  const ActivePage = pages[active] ?? Dashboard;

  return (
    <div className="flex bg-paper">
      <Sidebar active={active} onNavigate={setActive} />
      <main className="flex-1">
        <Topbar title={active} />
        <ActivePage />
      </main>
    </div>
  );
}
