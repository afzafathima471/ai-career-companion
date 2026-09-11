import { useState } from "react";

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 flex-shrink-0 transition-colors ${
        checked ? "bg-navy" : "bg-line"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const [name, setName] = useState("Afza Fathima");
  const [email, setEmail] = useState("afza@example.com");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [matchAlerts, setMatchAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  return (
    <div className="max-w-2xl px-10 py-8">
      <p className="mb-8 text-[15px] text-ink/60">
        Manage your profile, notifications, and account.
      </p>

      <div className="border border-line bg-white px-6 py-6">
        <h2 className="mb-5 font-display text-[17px] text-ink">Profile</h2>

        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy font-display text-[20px] text-white">
            {name.charAt(0)}
          </div>
          <button className="border border-line px-3.5 py-1.5 text-[13px] text-ink/70 hover:border-navy/40">
            Change photo
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[13px] text-ink/70">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-navy"
            />
          </div>
          <div>
            <label className="text-[13px] text-ink/70">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-navy"
            />
          </div>
          <div>
            <label className="text-[13px] text-ink/70">Target role</label>
            <input
              type="text"
              defaultValue="Frontend / Full Stack Intern"
              className="mt-1.5 w-full border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-navy"
            />
          </div>
        </div>

        <button className="mt-6 bg-navy px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90">
          Save changes
        </button>
      </div>

      <div className="mt-6 border border-line bg-white px-6 py-6">
        <h2 className="mb-5 font-display text-[17px] text-ink">Notifications</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] text-ink">Email alerts</p>
              <p className="text-[12px] text-ink/50">Get notified about application updates</p>
            </div>
            <Toggle checked={emailAlerts} onChange={setEmailAlerts} />
          </div>
          <div className="flex items-center justify-between border-t border-line pt-4">
            <div>
              <p className="text-[14px] text-ink">New match alerts</p>
              <p className="text-[12px] text-ink/50">Ping me when a strong match is found</p>
            </div>
            <Toggle checked={matchAlerts} onChange={setMatchAlerts} />
          </div>
          <div className="flex items-center justify-between border-t border-line pt-4">
            <div>
              <p className="text-[14px] text-ink">Weekly digest</p>
              <p className="text-[12px] text-ink/50">Summary of matches and application activity</p>
            </div>
            <Toggle checked={weeklyDigest} onChange={setWeeklyDigest} />
          </div>
        </div>
      </div>

      <div className="mt-6 border border-line bg-white px-6 py-6">
        <h2 className="mb-1 font-display text-[17px] text-ink">Account</h2>
        <p className="mb-4 text-[13px] text-ink/50">Sign out or remove your account.</p>
        <div className="flex gap-3">
          <button className="border border-line px-3.5 py-2 text-[13px] text-ink/70 hover:border-navy/40">
            Log out
          </button>
          <button className="border border-line px-3.5 py-2 text-[13px] text-ink/40 hover:border-ink/30">
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
