"use client";

import { useEffect, useState } from "react";
import type { StoreSnapshot } from "@/lib/store";

const PASSWORD_STORAGE = "raffle-admin-pw-v1";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [snapshot, setSnapshot] = useState<StoreSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(PASSWORD_STORAGE);
    if (saved) {
      setPassword(saved);
      verify(saved);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const data = (await res.json()) as StoreSnapshot;
        if (!cancelled) setSnapshot(data);
      } catch {
        // ignore
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [authed]);

  async function verify(pw: string) {
    setAuthError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "x-admin-password": pw },
      });
      if (res.ok) {
        setAuthed(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(PASSWORD_STORAGE, pw);
        }
      } else {
        setAuthed(false);
        setAuthError("Yanlış şifre.");
      }
    } catch {
      setAuthError("Sunucuya ulaşılamadı.");
    }
  }

  async function startDraw() {
    if (!confirm("Çekiliş başlatılsın mı? Yeni katılım kapanacak.")) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/draw", {
        method: "POST",
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (!data.ok) {
        setMessage(`Hata: ${data.reason}`);
      } else {
        setMessage(`Çekiliş başladı. Kazanan: ${data.winner.name} (animasyon bittikten sonra "Sonucu Göster"e bas)`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function revealWinner() {
    setBusy(true);
    try {
      await fetch("/api/draw", {
        method: "PATCH",
        headers: { "x-admin-password": password },
      });
      setMessage("Kazanan ekrana getirildi.");
    } finally {
      setBusy(false);
    }
  }

  async function removeParticipant(id: string, name: string) {
    if (!confirm(`${name} silinsin mi?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    if (!confirm("TÜM kayıtlar silinsin mi? Geri alınamaz.")) return;
    setBusy(true);
    try {
      await fetch("/api/admin?all=1", {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
      setMessage("Sıfırlandı.");
    } finally {
      setBusy(false);
    }
  }

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify(password);
          }}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
        >
          <h1 className="text-xl font-bold">Admin</h1>
          <p className="mt-1 text-sm text-white/60">Şifre gir.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-4 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-base outline-none focus:border-brand-primary"
            autoFocus
          />
          {authError && <p className="mt-2 text-sm text-red-400">{authError}</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-brand-primary px-4 py-3 font-semibold transition hover:bg-brand-primary/90"
          >
            Giriş
          </button>
        </form>
      </main>
    );
  }

  const state = snapshot?.state ?? "idle";
  const stateLabel: Record<string, { text: string; color: string }> = {
    idle: { text: "Hazırlık", color: "text-emerald-400" },
    drawing: { text: "Çark dönüyor", color: "text-amber-400" },
    finished: { text: "Tamamlandı", color: "text-brand-accent" },
  };

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Paneli</h1>
          <span className={`text-sm font-semibold ${stateLabel[state].color}`}>
            ● {stateLabel[state].text}
          </span>
        </header>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-semibold">Kontrol</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={startDraw}
              disabled={busy || state !== "idle" || (snapshot?.participants.length ?? 0) === 0}
              className="rounded-lg bg-brand-primary px-5 py-3 font-semibold transition hover:bg-brand-primary/90 disabled:opacity-40"
            >
              🎲 Çekilişi Başlat
            </button>
            <button
              onClick={revealWinner}
              disabled={busy || state !== "drawing"}
              className="rounded-lg bg-amber-500 px-5 py-3 font-semibold text-black transition hover:bg-amber-400 disabled:opacity-40"
            >
              🎉 Sonucu Göster
            </button>
            <button
              onClick={resetAll}
              disabled={busy}
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-3 font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
            >
              🗑 Sıfırla
            </button>
          </div>
          {message && <p className="mt-4 text-sm text-white/70">{message}</p>}
          {snapshot?.winner && state !== "idle" && (
            <p className="mt-4 rounded-lg bg-amber-500/10 px-4 py-3 text-amber-200">
              <strong>Kazanan:</strong> {snapshot.winner.name}
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Katılımcılar ({snapshot?.participants.length ?? 0})
          </h2>
          {!snapshot || snapshot.participants.length === 0 ? (
            <p className="text-sm text-white/50">Henüz kayıt yok.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {snapshot.participants.map((p, idx) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-3">
                    <span className="w-6 text-xs text-white/40">{idx + 1}</span>
                    <span>{p.name}</span>
                  </span>
                  <button
                    onClick={() => removeParticipant(p.id, p.name)}
                    disabled={busy || state !== "idle"}
                    className="rounded px-3 py-1 text-xs text-red-300 transition hover:bg-red-500/10 disabled:opacity-30"
                  >
                    Sil
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
