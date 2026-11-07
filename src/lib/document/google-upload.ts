/** Google resumable uploads use a short-lived session URI, not an OAuth access token. */
export async function transferToDrive(sessionUri: string, blob: Blob): Promise<void> {
  const url = new URL(sessionUri);
  if (url.protocol !== "https:" || url.hostname !== "www.googleapis.com" ||
      !url.pathname.startsWith("/upload/drive/v3/files")) {
    throw new Error("Ungültiges Upload-Ziel");
  }

  try {
    const res = await fetch(sessionUri, {
      method: "PUT", headers: { "Content-Type": "application/pdf" },
      body: blob, cache: "no-store",
    });
    if (res.ok) return;
    if (res.status !== 308 && res.status !== 503 && res.status < 500) {
      throw new Error("Google Drive hat den Upload abgelehnt");
    }
  } catch {
    // A network error can occur after Drive already accepted bytes. Query the session.
  }

  // Ask Drive what it actually received before sending any remaining bytes.
  const status = await fetch(sessionUri, {
    method: "PUT",
    headers: { "Content-Range": `bytes */${blob.size}` },
    cache: "no-store",
  });
  if (status.ok) return;
  if (status.status !== 308) throw new Error("Upload-Status kann nicht ermittelt werden");
  const range = status.headers.get("Range");
  const matched = /^bytes=0-(\d+)$/.exec(range ?? "");
  const offset = matched ? Number(matched[1]) + 1 : 0;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > blob.size) {
    throw new Error("Ungültiger Google-Uploadstatus");
  }
  if (offset === blob.size) return;
  const resumed = await fetch(sessionUri, {
    method: "PUT",
    headers: {
      "Content-Type": "application/pdf",
      "Content-Range": `bytes ${offset}-${blob.size - 1}/${blob.size}`,
    },
    body: blob.slice(offset), cache: "no-store",
  });
  if (!resumed.ok) throw new Error("Fortsetzung des Google-Uploads fehlgeschlagen");
}
