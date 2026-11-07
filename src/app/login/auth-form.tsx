"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function AuthForm() {
  const router = useRouter();
  const [create, setCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = create
        ? await authClient.signUp.email({ name, email, password }, {
            headers: { "x-archive-setup-token": setupToken },
          })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError("Anmeldung fehlgeschlagen. Bitte Eingaben oder Zugangsberechtigung prüfen.");
        return;
      }
      router.push("/archive");
      router.refresh();
    } catch {
      setError("Anmeldung derzeit nicht möglich. Bitte später erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  return <section className="auth-panel" aria-label="Anmeldung">
    <p className="eyebrow">DOC ARCHIVE</p>
    <h2>{create ? "Privates Konto einrichten" : "Willkommen zurück"}</h2>
    <p className="muted">Nur für freigegebene Konten. Deine Dokumente bleiben privat.</p>
    <form onSubmit={submit} className="form-stack">
      {create && <label>Dein Name
        <input type="text" autoComplete="name" minLength={2} maxLength={120}
          required value={name} onChange={e => setName(e.target.value)} />
      </label>}
      <label>E-Mail
        <input type="email" autoComplete="email" required maxLength={320}
          value={email} onChange={e => setEmail(e.target.value)} />
      </label>
      <label>Passwort
        <input type="password" autoComplete={create ? "new-password" : "current-password"}
          minLength={12} required value={password}
          onChange={e => setPassword(e.target.value)} />
      </label>
      {create && <label>Einrichtungsschlüssel
        <input type="password" autoComplete="off" minLength={32} required
          value={setupToken} onChange={e => setSetupToken(e.target.value)} />
      </label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? "Wird geprüft …" : create ? "Konto erstellen" : "Anmelden"}
      </button>
    </form>
    <button className="text-button" type="button" onClick={() => {
      setCreate(!create);
      setSetupToken("");
      setError(null);
    }}>{create ? "Bereits registriert? Anmelden" : "Erstes Konto einrichten"}</button>
  </section>;
}
