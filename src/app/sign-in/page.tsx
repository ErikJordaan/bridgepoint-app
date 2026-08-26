"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    const result = await signIn.email({ email, password });
    setLoading(false);
    if (result.error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="centered-screen">
      <form onSubmit={onSubmit} className="card" style={{ width: 340, textAlign: "center" }}>
        <h1 style={{ color: "var(--brand-blue)", marginBottom: 4 }}>BridgePoint</h1>
        <p style={{ color: "#605e5c", marginBottom: 20 }}>Sign in to continue</p>

        {error && <div style={{ background: "#fbe1e2", color: "var(--brand-red)", padding: 8, borderRadius: 4, marginBottom: 12, fontSize: 13 }}>{error}</div>}

        <div style={{ textAlign: "left", marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div style={{ textAlign: "left", marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <button type="submit" className="primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div style={{ marginTop: 14 }}>
          <a href="/forgot-password" style={{ fontSize: 13, color: "var(--brand-blue)" }}>Forgot password?</a>
        </div>
      </form>
    </div>
  );
}
