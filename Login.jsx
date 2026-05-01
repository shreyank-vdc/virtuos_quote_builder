import { useState } from "react";
import { supabase } from "./supabase.js";
import LOGO_SRC from "./logoData.js";

const V = { navy:"#0D1B3E", pink:"#E84B9C", border:"#E2E8F0", muted:"#64748B", ink:"#1E293B" };
const IS = { border:`1.5px solid ${V.border}`, borderRadius:"8px", padding:"10px 13px", fontSize:"14px",
  color:V.ink, background:"#fff", outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };

export default function Login({ onAuth }) {
  const [mode, setMode]       = useState("login"); // "login" | "signup" | "reset"
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [info, setInfo]       = useState("");

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
      options: { data: { full_name: name } }
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setInfo("Check your email for a confirmation link, then log in.");
    setMode("login");
  }

  async function handleReset(e) {
    e.preventDefault();
    setError(""); setInfo("");
    if (!validateEmail(email)) return;
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setInfo("Password reset email sent. Check your inbox.");
    setMode("login");
  }

  const titles = { login:"Welcome back", signup:"Create your account", reset:"Reset your password" };
  const subs   = { login:"Sign in to Virtuos Quote Builder", signup:"Only @virtuos.com emails are allowed", reset:"We'll send you a reset link" };

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

              {mode!=="reset" && (
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

          {/* Mode switcher */}
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
            {mode!=="login" && (
              <button onClick={()=>{setMode("login");setError("");setInfo("");}}
                style={{ background:"none", border:"none", color:V.pink, cursor:"pointer",
                  fontSize:"13px", fontWeight:600, fontFamily:"inherit" }}>
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:"11px", marginTop:"20px" }}>
          Restricted to Virtuos Digital employees only
        </p>
      </div>
    </div>
  );
}
