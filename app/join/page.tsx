"use client";

import { useEffect, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const STORAGE_KEY = "raffle-joined-v1";

type Status = "loading" | "ready" | "submitting" | "success" | "duplicate" | "locked" | "error";

export default function JoinPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [savedName, setSavedName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const visitorId = result.visitorId;
        setFingerprint(visitorId);

        const res = await fetch(`/api/check?fingerprint=${encodeURIComponent(visitorId)}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (data.registered) {
          const localName = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
          if (localName) setSavedName(localName);
          setStatus("duplicate");
          return;
        }

        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
        }

        if (data.state === "drawing" || data.state === "finished") {
          setStatus("locked");
          return;
        }

        setStatus("ready");
      } catch {
        setStatus("error");
        setErrorMessage("Cihaz tanımlanamadı, lütfen sayfayı yenileyin.");
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fingerprint) return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, surname, fingerprint }),
      });
      const data = await res.json();
      if (data.ok) {
        const fullName = `${name.trim()} ${surname.trim()}`;
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, fullName);
        }
        setSavedName(fullName);
        setStatus("success");
      } else if (data.reason === "duplicate-device") {
        setStatus("duplicate");
      } else if (data.reason === "draw-locked") {
        setStatus("locked");
      } else {
        setStatus("error");
        setErrorMessage(humanizeReason(data.reason));
      }
    } catch {
      setStatus("error");
      setErrorMessage("Ağ hatası, tekrar dener misin?");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Security Day IV</p>
          <h1 className="mt-2 text-3xl font-bold">Çekilişe Katıl</h1>
          <p className="mt-2 text-sm text-white/60">
            Adını ve soyadını yaz, çekilişe dahil ol.
          </p>
        </header>

        {status === "loading" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
            Cihaz hazırlanıyor…
          </div>
        )}

        {status === "ready" || status === "submitting" || status === "error" ? (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
          >
            <label className="block text-xs uppercase tracking-wider text-white/60">
              Ad
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-base outline-none focus:border-brand-primary"
              placeholder="Adın"
            />
            <label className="mt-4 block text-xs uppercase tracking-wider text-white/60">
              Soyad
            </label>
            <input
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              maxLength={40}
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-base outline-none focus:border-brand-primary"
              placeholder="Soyadın"
            />
            {errorMessage && (
              <p className="mt-3 text-sm text-red-400">{errorMessage}</p>
            )}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="mt-6 w-full rounded-lg bg-brand-primary px-4 py-3 text-base font-semibold text-brand-dark transition hover:brightness-110 disabled:opacity-50"
            >
              {status === "submitting" ? "Gönderiliyor…" : "Katıl"}
            </button>
          </form>
        ) : null}

        {status === "success" && (
          <div className="rounded-2xl border border-emerald-300/30 bg-emerald-200/10 p-6 text-center">
            <div className="text-4xl">✓</div>
            <h2 className="mt-2 text-xl font-semibold">Kaydoldun!</h2>
            <p className="mt-1 text-sm text-white/70">
              <span className="font-medium text-white">{savedName}</span>
              <br />
              ana ekrandaki listede gözükeceksin.
            </p>
          </div>
        )}

        {status === "duplicate" && (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-200/10 p-6 text-center">
            <div className="text-4xl">⚠</div>
            <h2 className="mt-2 text-xl font-semibold">Zaten kayıtlısın</h2>
            <p className="mt-1 text-sm text-white/70">
              {savedName ? <>Bu cihazdan <span className="font-medium text-white">{savedName}</span> olarak katıldın.</> : "Bu cihazdan zaten bir kayıt yapılmış."}
            </p>
          </div>
        )}

        {status === "locked" && (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-200/10 p-6 text-center">
            <h2 className="text-xl font-semibold">Çekiliş başladı</h2>
            <p className="mt-1 text-sm text-white/70">
              Yeni katılım kapandı. Bir dahaki sefere!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function humanizeReason(reason?: string): string {
  switch (reason) {
    case "missing-name":
      return "Ad ve soyad zorunlu.";
    case "name-too-long":
      return "İsim çok uzun, kısaltır mısın?";
    case "missing-fingerprint":
      return "Cihaz tanımlanamadı.";
    default:
      return "Bir şeyler ters gitti, tekrar dene.";
  }
}
