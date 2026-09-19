import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import Resume from "./pages/Resume";
import Internships from "./pages/Internships";
import SkillGap from "./pages/SkillGap";
import Customize from "./pages/Customize";
import Interview from "./pages/Interview";
import CareerAssistant from "./pages/CareerAssistant";
import Applications from "./pages/Applications";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Login from "./pages/Login";

const STORAGE_KEY = "careerai_student";

function loadStoredStudent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [student, setStudentState] = useState(loadStoredStudent);
  const [active, setActive] = useState("Dashboard");

  function setStudent(value) {
    setStudentState(value);
    if (value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  if (!student) {
    return <Login onLogin={setStudent} />;
  }

  const pageProps = { student };

  const pages = {
    Dashboard: <Dashboard {...pageProps} />,
    Resume: <Resume {...pageProps} />,
    "Job-Resume Matching": <Internships {...pageProps} />,
    "Skill Gap": <SkillGap {...pageProps} />,
    Customize: <Customize {...pageProps} />,
    Interview: <Interview {...pageProps} />,
    "Career Assistant": <CareerAssistant {...pageProps} />,
    Applications: <Applications {...pageProps} />,
    Settings: <Settings {...pageProps} onStudentUpdate={setStudent} onLogout={() => setStudent(null)} />,
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
