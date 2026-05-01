import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { supabase } from "./supabase.js";
import Login from "./Login.jsx";
import QuoteBuilder from "./App.jsx";

function Root() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (user === undefined) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0D1B3E,#162447)",
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"36px", height:"36px", border:"3px solid rgba(255,255,255,0.15)",
        borderTop:"3px solid #E84B9C", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return <Login onAuth={setUser}/>;
  return <QuoteBuilder user={user} onSignOut={()=>supabase.auth.signOut()}/>;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><Root/></React.StrictMode>
);
