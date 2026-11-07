import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/session";
import AuthForm from "./auth-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getViewer();
  if (user) redirect("/archive");
  return <main className="auth-page">
    <div className="auth-intro">
      <div className="brandmark">D<span>.</span></div>
      <p className="eyebrow">PRIVATE DOCUMENT WORKSPACE</p>
      <h1>Alles im Archiv.<br /><span>Alles im Griff.</span></h1>
      <p>Post einscannen, als PDF speichern und Dokumente auf Anhieb wiederfinden. Dein persönliches Archiv mit Google Drive.</p>
      <div className="auth-capabilities">
        <div><span className="status-dot" /> Privat und zugriffsgeschützt</div>
        <div><span className="status-dot" /> Eigener Google-Drive-Speicher</div>
        <div><span className="status-dot" /> Keine externen OCR-Kosten geplant</div>
      </div>
    </div>
    <AuthForm />
  </main>;
}
