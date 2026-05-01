import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import LOGO_SRC from "./logoData.js";

const V = { navy:"#0D1B3E", pink:"#E84B9C", border:"#E2E8F0", muted:"#64748B", ink:"#1E293B" };
const IS = { border:`1.5px solid ${V.border}`, borderRadius:"8px", padding:"10px 13px", fontSize:"14px",
  color:V.ink, background:"#fff", outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };

export default function Login({ onAuth }) {
  const [mode, setMode]         = useState("login"); // "login"|"signup"|"reset"|"new-password"
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [info, setInfo]         = useState("");

  // Detect password-reset or email-confirm redirect (Supabase puts tokens in the URL hash)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setMode("new-password");
      setInfo("Enter your new password below.");
      window.history.replaceState(null, "", window.location.pathname);
    }
    // Handle email confirmation redirect — user arrives already signed in
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("new-password");
        setError(""); setInfo("Enter your new password below.");
      }
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user && mode !== "new-password") {
        onAuth(session.user);
      }
    });
  }, []); // eslint-disable-line

  function validateEmail(e) {
    if (!e.endsWith("@virtuos.com") && !e.endsWith("@virtuosdigital.com")) {
      setError("Only @virtuos.com or @virtuosdigital.com email addresses are allowed.");
      return false;
    }
    return true;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setInfo("");
    if (!validateEmail(email)) return;
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onAuth(data.user);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError(""); setInfo("");
    if (!validateEmail(email)) return;
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!name.trim()) { setError("Please enter your full name."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      }
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setInfo("✅ Check your inbox for a confirmation link, then come back and sign in.");
    setMode("login");
  }

  async function handleReset(e) {
    e.preventDefault();
    setError(""); setInfo("");
    if (!validateEmail(email)) return;
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setInfo("✅ Password reset email sent — check your inbox.");
    setMode("login");
  }

  async function handleNewPassword(e) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setInfo("✅ Password updated! Signing you in…");
    setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) onAuth(data.session.user);
      else setMode("login");
    }, 1200);
  }

  async function handleGoogle() {
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    setLoading(false);
    if (err) setError(err.message);
  }

  const titles = {
    login: "Welcome back",
    signup: "Create your account",
    reset: "Reset your password",
    "new-password": "Set a new password",
  };
  const subs = {
    login: "Sign in to Virtuos Quote Builder",
    signup: "Only @virtuos.com emails are allowed",
    reset: "We'll send a reset link to your inbox",
    "new-password": "Choose a strong password",
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0D1B3E 0%,#162447 60%,#1A2C55 100%)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:"20px",
      fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;}`}</style>

      <div style={{ width:"100%", maxWidth:"420px" }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"28px" }}>
          <div style={{ background:"#fff", borderRadius:"14px", padding:"12px 24px",
            display:"inline-flex", alignItems:"center", boxShadow:"0 8px 30px rgba(0,0,0,0.25)" }}>
            <img src={LOGO_SRC} alt="Virtuos Digital" style={{ height:"40px", display:"block" }}/>
          </div>
          <div style={{ color:"rgba(255,255,255,0.4)", fontSize:"11px", marginTop:"10px",
            textTransform:"uppercase", letterSpacing:"0.12em" }}>Quote Builder</div>
        </div>

        {/* Card */}
        <div style={{ background:"#fff", borderRadius:"18px", padding:"32px",
          boxShadow:"0 24px 60px rgba(0,0,0,0.35)" }}>
          <h2 style={{ margin:"0 0 4px", fontSize:"20px", fontWeight:800, color:V.navy }}>{titles[mode]}</h2>
          <p style={{ margin:"0 0 24px", fontSize:"13px", color:V.muted }}>{subs[mode]}</p>

          {error && (
            <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"8px",
              padding:"10px 13px", fontSize:"13px", color:"#DC2626", marginBottom:"16px" }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:"8px",
              padding:"10px 13px", fontSize:"13px", color:"#166534", marginBottom:"16px" }}>
              {info}
            </div>
          )}

          {/* ── New password form (after reset link click) ── */}
          {mode === "new-password" && (
            <form onSubmit={handleNewPassword}>
              <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                <div>
                  <label style={{ fontSize:"10.5px", fontWeight:700, color:V.muted,
                    textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"4px" }}>
                    New Password
                  </label>
                  <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters" required style={IS}
                    onFocus={e=>e.target.style.borderColor=V.pink}
                    onBlur={e=>e.target.style.borderColor=V.border}/>
                </div>
                <div>
                  <label style={{ fontSize:"10.5px", fontWeight:700, color:V.muted,
                    textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"4px" }}>
                    Confirm Password
                  </label>
                  <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password" required style={IS}
                    onFocus={e=>e.target.style.borderColor=V.pink}
                    onBlur={e=>e.target.style.borderColor=V.border}/>
                </div>
                <button type="submit" disabled={loading}
                  style={{ background:"linear-gradient(135deg,#E84B9C,#F97316)", color:"#fff", border:"none",
                    padding:"12px", borderRadius:"9px", cursor:loading?"not-allowed":"pointer",
                    fontSize:"14px", fontWeight:700, fontFamily:"inherit",
                    opacity:loading?0.7:1, boxShadow:"0 4px 14px rgba(232,75,156,0.4)" }}>
                  {loading ? "Updating…" : "Set New Password"}
                </button>
              </div>
            </form>
          )}

          {/* ── Normal login / signup / reset forms ── */}
          {mode !== "new-password" && (
            <>
              {/* Google SSO — login & signup only */}
              {(mode === "login" || mode === "signup") && (
                <>
                  <button type="button" onClick={handleGoogle} disabled={loading}
                    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px",
                      border:"1.5px solid #E2E8F0", borderRadius:"9px", padding:"11px", background:"#fff",
                      cursor:loading?"not-allowed":"pointer", fontSize:"14px", fontWeight:600,
                      fontFamily:"inherit", color:V.ink, marginBottom:"16px",
                      boxShadow:"0 1px 3px rgba(0,0,0,0.07)" }}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow="0 3px 10px rgba(0,0,0,0.12)"}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.07)"}>
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    Continue with Google
                  </button>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px" }}>
                    <div style={{ flex:1, height:"1px", background:"#E2E8F0" }}/>
                    <span style={{ fontSize:"11px", color:"#94A3B8", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em" }}>or</span>
                    <div style={{ flex:1, height:"1px", background:"#E2E8F0" }}/>
                  </div>
                </>
              )}

              <form onSubmit={mode==="login"?handleLogin:mode==="signup"?handleSignup:handleReset}>
                <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                  {mode==="signup" && (
                    <div>
                      <label style={{ fontSize:"10.5px", fontWeight:700, color:V.muted,
                        textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"4px" }}>
                        Full Name
                      </label>
                      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Smith"
                        required style={IS}
                        onFocus={e=>e.target.style.borderColor=V.pink}
                        onBlur={e=>e.target.style.borderColor=V.border}/>
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize:"10.5px", fontWeight:700, color:V.muted,
                      textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"4px" }}>
                      Work Email
                    </label>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                      placeholder="you@virtuos.com" required style={IS}
                      onFocus={e=>e.target.style.borderColor=V.pink}
                      onBlur={e=>e.target.style.borderColor=V.border}/>
                  </div>
                  {mode !== "reset" && (
                    <div>
                      <label style={{ fontSize:"10.5px", fontWeight:700, color:V.muted,
                        textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"4px" }}>
                        Password
                      </label>
                      <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                        placeholder={mode==="signup"?"Min. 8 characters":"••••••••"} required style={IS}
                        onFocus={e=>e.target.style.borderColor=V.pink}
                        onBlur={e=>e.target.style.borderColor=V.border}/>
                    </div>
                  )}
                  <button type="submit" disabled={loading}
                    style={{ background:"linear-gradient(135deg,#E84B9C,#F97316)", color:"#fff", border:"none",
                      padding:"12px", borderRadius:"9px", cursor:loading?"not-allowed":"pointer",
                      fontSize:"14px", fontWeight:700, fontFamily:"inherit",
                      opacity:loading?0.7:1, boxShadow:"0 4px 14px rgba(232,75,156,0.4)" }}>
                    {loading ? "Please wait…" : mode==="login" ? "Sign In" : mode==="signup" ? "Create Account" : "Send Reset Link"}
                  </button>
                </div>
              </form>

              <div style={{ marginTop:"20px", paddingTop:"18px", borderTop:"1px solid #F1F5F9",
                display:"flex", flexDirection:"column", gap:"8px", alignItems:"center" }}>
                {mode==="login" && <>
                  <button onClick={()=>{setMode("signup");setError("");setInfo("");}}
                    style={{ background:"none", border:"none", color:V.pink, cursor:"pointer",
                      fontSize:"13px", fontWeight:600, fontFamily:"inherit" }}>
                    New user? Create account
                  </button>
                  <button onClick={()=>{setMode("reset");setError("");setInfo("");}}
                    style={{ background:"none", border:"none", color:V.muted, cursor:"pointer",
                      fontSize:"12px", fontFamily:"inherit" }}>
                    Forgot password?
                  </button>
                </>}
                {mode !== "login" && (
                  <button onClick={()=>{setMode("login");setError("");setInfo("");}}
                    style={{ background:"none", border:"none", color:V.pink, cursor:"pointer",
                      fontSize:"13px", fontWeight:600, fontFamily:"inherit" }}>
                    ← Back to sign in
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:"11px", marginTop:"20px" }}>
          Restricted to Virtuos Digital employees only
        </p>
      </div>
    </div>
  );
}
