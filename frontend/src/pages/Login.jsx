/* ============================================================
   TRAPMAP — LOGIN PAGE
   Mit Passwort vergessen und Passwort-Ändern-Zwang
   ============================================================ */

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader, Mail, Lock, AlertCircle, Check, ArrowLeft } from "lucide-react";
import trapMapLogo from "../assets/trapmap-logo-150.png";

const API = import.meta.env.VITE_API_URL;

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');

  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // View State: "login" | "forgot" | "reset" | "changePassword"
  const [view, setView] = useState(resetToken ? "reset" : "login");

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Reset Password State (mit Token)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Must Change Password State
  const [mustChangeUser, setMustChangeUser] = useState(null);
  const [tempToken, setTempToken] = useState(null);

  // ============================================
  // LOGIN
  // ============================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log("LOGIN ATTEMPT:", email);

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      console.log("LOGIN RESPONSE STATUS:", res.status);
      const data = await res.json();
      console.log("LOGIN DATA:", data);

      if (!res.ok) {
        setError(data.error || "Login fehlgeschlagen");
        return;
      }

      // Prüfe ob Passwort geändert werden muss
      if (data.user.must_change_password) {
        console.log("MUST CHANGE PASSWORD");
        setMustChangeUser(data.user);
        setTempToken(data.token);
        setView("changePassword");
        return;
      }

      // Normaler Login
      console.log("SAVING TO LOCALSTORAGE...");
      localStorage.setItem("trapmap_token", data.token);
      localStorage.setItem("trapmap_refresh_token", data.refreshToken);
      localStorage.setItem("trapmap_user", JSON.stringify(data.user));

      window.location.href = "/dashboard";
      navigate("/dashboard");
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PASSWORT VERGESSEN
  // ============================================
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      // Immer Erfolg anzeigen (Security)
      setForgotSent(true);
    } catch (err) {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PASSWORT ZURÜCKSETZEN (mit Token)
  // ============================================
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError("Passwörter stimmen nicht überein");
      return;
    }

    if (newPassword.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Zurücksetzen");
        return;
      }

      setResetSuccess(true);
    } catch (err) {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // NEUES PASSWORT SETZEN (nach erstem Login)
  // ============================================
  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError("Passwörter stimmen nicht überein");
      return;
    }

    if (newPassword.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/auth/set-password`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${tempToken}`
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Setzen des Passworts");
        return;
      }

      // Erfolg - jetzt einloggen
      localStorage.setItem("trapmap_token", tempToken);
      localStorage.setItem("trapmap_user", JSON.stringify({ ...mustChangeUser, must_change_password: false }));

      window.location.href = "/dashboard";
    } catch (err) {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER: LOGIN
  // ============================================
  if (view === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d0d1a] via-[#1a1a2e] to-[#0d0d1a] px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={trapMapLogo} alt="TrapMap" className="h-24 mx-auto mb-4" />
            <p className="text-gray-400">Schädlingsüberwachung</p>
          </div>

          <div className="bg-gray-900/80 dark:bg-gray-900/90 backdrop-blur-xl border border-white/10 dark:border-white/20 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white dark:text-gray-100 mb-6 text-center">Anmelden</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 dark:text-gray-500 mb-1">E-Mail</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-950 dark:bg-gray-950 border border-white/10 dark:border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 dark:placeholder-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="ihre@email.de"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Passwort</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    aria-label="Passwort anzeigen"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader size={20} className="animate-spin" /> : "Anmelden"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setView("forgot"); setError(""); }}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                Passwort vergessen?
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: PASSWORT VERGESSEN
  // ============================================
  if (view === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d0d1a] via-[#1a1a2e] to-[#0d0d1a] px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={trapMapLogo} alt="TrapMap" className="h-24 mx-auto mb-4" />
          </div>

          <div className="bg-gray-900/80 dark:bg-gray-900/90 backdrop-blur-xl border border-white/10 dark:border-white/20 rounded-2xl p-8 shadow-2xl">
            <button
              onClick={() => { setView("login"); setForgotSent(false); setError(""); }}
              className="flex items-center gap-1 text-gray-400 hover:text-white mb-4"
            >
              <ArrowLeft size={16} />
              Zurück zum Login
            </button>

            <h2 className="text-2xl font-bold text-white mb-2">Passwort vergessen</h2>
            <p className="text-gray-400 text-sm mb-6">
              Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen.
            </p>

            {forgotSent ? (
              <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400">
                <Check size={20} className="inline mr-2" />
                Falls ein Account mit dieser E-Mail existiert, haben wir Ihnen einen Link gesendet.
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-1">E-Mail</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-gray-950 dark:bg-black border border-white/10 dark:border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                      placeholder="ihre@email.de"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader size={20} className="animate-spin" /> : "Link senden"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: PASSWORT ZURÜCKSETZEN (mit Token)
  // ============================================
  if (view === "reset") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d0d1a] via-[#1a1a2e] to-[#0d0d1a] px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={trapMapLogo} alt="TrapMap" className="h-24 mx-auto mb-4" />
          </div>

          <div className="bg-gray-900/80 dark:bg-gray-900/90 backdrop-blur-xl border border-white/10 dark:border-white/20 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">Neues Passwort</h2>
            <p className="text-gray-400 text-sm mb-6">
              Geben Sie Ihr neues Passwort ein.
            </p>

            {resetSuccess ? (
              <div className="text-center">
                <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 mb-4">
                  <Check size={20} className="inline mr-2" />
                  Passwort erfolgreich geändert!
                </div>
                <button
                  onClick={() => { setView("login"); navigate("/login"); }}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  Jetzt anmelden →
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Neues Passwort</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-gray-950 dark:bg-black border border-white/10 dark:border-white/20 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                      placeholder="Mindestens 8 Zeichen"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      aria-label="Passwort anzeigen"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Passwort bestätigen</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-gray-950 dark:bg-black border border-white/10 dark:border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                      placeholder="Passwort wiederholen"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader size={20} className="animate-spin" /> : "Passwort speichern"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: PASSWORT ÄNDERN (nach erstem Login)
  // ============================================
  if (view === "changePassword") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d0d1a] via-[#1a1a2e] to-[#0d0d1a] px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={trapMapLogo} alt="TrapMap" className="h-24 mx-auto mb-4" />
          </div>

          <div className="bg-gray-900/80 dark:bg-gray-900/90 backdrop-blur-xl border border-white/10 dark:border-white/20 rounded-2xl p-8 shadow-2xl">
            <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400">
              <AlertCircle size={20} className="inline mr-2" />
              <strong>Willkommen, {mustChangeUser?.first_name}!</strong>
              <p className="mt-1 text-sm">Bitte ändern Sie Ihr temporäres Passwort.</p>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Neues Passwort festlegen</h2>
            <p className="text-gray-400 text-sm mb-6">
              Wählen Sie ein sicheres Passwort für Ihren Account.
            </p>

            <form onSubmit={handleSetNewPassword} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1">Neues Passwort</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                    placeholder="Mindestens 8 Zeichen"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    aria-label="Passwort anzeigen"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Passwort bestätigen</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                    placeholder="Passwort wiederholen"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader size={20} className="animate-spin" /> : "Passwort speichern & Anmelden"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}