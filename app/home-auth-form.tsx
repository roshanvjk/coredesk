"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function HomeAuthForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      const message = "Enter username and password.";
      setError(message);
      toast.error(message);
      return;
    }

    // Credentials are verified by Clerk on the sign-in page.
    router.push(`/sign-in?identifier=${encodeURIComponent(username.trim())}`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-7 space-y-3">
      <input
        type="text"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder="Username"
        className="app-input"
      />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        className="app-input"
      />
      {error ? <p className="app-error-text">{error}</p> : null}
      <button type="submit" className="app-btn-primary">
        Sign In
      </button>
    </form>
  );
}
