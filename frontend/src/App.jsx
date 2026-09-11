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

export default function App() {
  const [student, setStudent] = useState(null);
  const [active, setActive] = useState("Dashboard");

  if (!student) {
    return <Login onLogin={setStudent} />;
  }

  const pageProps = { student };

  const pages = {
    Dashboard: <Dashboard {...pageProps} />,
    Resume: <Resume {...pageProps} />,
    Internships: <Internships {...pageProps} />,
    Interview: <Interview {...pageProps} />,
    Applications: <Applications {...pageProps} />,
    Settings: <Settings {...pageProps} onStudentUpdate={setStudent} />,
    Help: <Help {...pageProps} />,
  };

  return (
    <div className="flex bg-paper">
      <Sidebar active={active} onNavigate={setActive} />
      <main className="flex-1">
        <Topbar title={active} userName={student.name} />
        {pages[active] ?? pages.Dashboard}
      </main>
    </div>
  );
}
