"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { StoreSnapshot } from "@/lib/store";

const PASSWORD_STORAGE = "raffle-admin-pw-v1";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [snapshot, setSnapshot] = useState<StoreSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualSurname, setManualSurname] = useState("");
  const [bulkText, setBulkText] = useState("");

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
    let lastCount = -1;
    let lastState = "";

    async function fetchFull() {
      const res = await fetch("/api/state", { cache: "no-store" });
      const data = (await res.json()) as StoreSnapshot;
      if (!cancelled) {
        setSnapshot(data);
        lastCount = data.participants.length;
        lastState = data.state;
      }
    }

    async function tick() {
      try {
        const res = await fetch("/api/state?light=1", { cache: "no-store" });
        const light = await res.json();
        if (cancelled) return;
        if (light.participantCount !== lastCount || light.state !== lastState) {
          await fetchFull();
        } else {
          setSnapshot((prev) =>
            prev
              ? {
                  ...prev,
                  state: light.state,
                  winner: light.winner,
                  spinSeed: light.spinSeed,
                  finishedAt: light.finishedAt,
                }
              : prev
          );
        }
      } catch {
        // ignore
      }
    }

    fetchFull();
    const id = setInterval(tick, 2500);
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
        setMessage(
          `Çekiliş başladı. Kazanan: ${data.winner.name} (animasyon bittikten sonra "Sonucu Göster"e bas)`
        );
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

  async function nextDraw() {
    setBusy(true);
    try {
      const res = await fetch("/api/draw", {
        method: "PUT",
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("Yeni çekiliş için hazır. (Kazananı listeden çıkarmak istersen yanındaki Sil butonunu kullan.)");
      } else {
        setMessage(`Hata: ${data.reason}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: manualName, surname: manualSurname }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`✓ ${manualName} ${manualSurname} eklendi.`);
        setManualName("");
        setManualSurname("");
      } else {
        setMessage(`Hata: ${data.reason}`);
      }
    } finally {
      setBusy(false);
    }
  }

  function parseBulkLines(text: string): string[] {
    return text
      .split(/\r?\n/)
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        // skip CSV header / our export headers
        const lower = trimmed.toLowerCase();
        if (
          lower === "ad soyad" ||
          lower === "isim" ||
          lower === "name" ||
          lower.startsWith("sıra,") ||
          lower.startsWith("sira,")
        ) {
          return "";
        }
        // CSV line from our export: "1,Ali Yılmaz,30.04.2026 ..."
        // pick the second column if there are commas/tabs/semicolons
        const parts = trimmed.split(/[,;\t]/).map((p) => p.trim());
        if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
          // first col is index → name is second
          return parts[1].replace(/^"|"$/g, "");
        }
        if (parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0) {
          // two columns: ad / soyad
          return `${parts[0]} ${parts[1]}`.replace(/"/g, "");
        }
        return parts[0].replace(/^"|"$/g, "");
      })
      .filter((s) => s.length > 0 && s.length <= 80);
  }

  async function addBulk() {
    const names = parseBulkLines(bulkText);
    if (names.length === 0) {
      setMessage("Hata: geçerli isim bulunamadı.");
      return;
    }
    if (!confirm(`${names.length} kişi eklenecek. Onaylıyor musun?`)) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/participants/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ names }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`✓ ${data.added} kişi eklendi.`);
        setBulkText("");
      } else {
        setMessage(`Hata: ${data.reason}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      setBulkText(text);
    } catch {
      setMessage("Dosya okunamadı.");
    }
  }

  function downloadCsv() {
    if (typeof window === "undefined") return;
    window.open("/api/export", "_blank");
  }

  function copySheetsFormula() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/api/export`;
    const formula = `=IMPORTDATA("${url}")`;
    navigator.clipboard.writeText(formula).then(
      () => setMessage("Sheets formülü kopyalandı! Boş bir hücreye yapıştır."),
      () => setMessage(`Kopyalama başarısız. Manuel yapıştır: ${formula}`)
    );
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify(password);
          }}
          className="w-full max-w-sm rounded-2xl border border-brand-teal/20 bg-brand-card/60 p-7 backdrop-blur-xl"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-brand-night ring-2 ring-brand-teal/60">
              <Image src="/mascot-face.jpg" alt="" fill sizes="48px" className="object-cover object-top" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-brand-teal">
                Security Day IV
              </p>
              <h1 className="text-xl font-bold text-brand-ice">Admin</h1>
            </div>
          </div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-ice/50">
            Şifre
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-brand-teal/15 bg-brand-night/60 px-4 py-3 text-base text-brand-ice outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/30"
            autoFocus
          />
          {authError && <p className="mt-3 text-sm text-rose-300">{authError}</p>}
          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-brand-teal to-brand-cyan px-4 py-3 font-bold text-brand-night transition hover:brightness-110 active:scale-[0.99]"
          >
            Giriş
          </button>
        </form>
      </main>
    );
  }

  const state = snapshot?.state ?? "idle";
  const stateLabel: Record<string, { text: string; color: string }> = {
    idle: { text: "Hazırlık", color: "text-emerald-300" },
    drawing: { text: "Çark dönüyor", color: "text-amber-300" },
    finished: { text: "Tamamlandı", color: "text-brand-teal" },
  };

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-brand-night ring-2 ring-brand-teal/60">
              <Image src="/mascot-face.jpg" alt="" fill sizes="44px" className="object-cover object-top" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-brand-teal">
                Security Day IV
              </p>
              <h1 className="text-2xl font-bold text-brand-ice">Admin Paneli</h1>
            </div>
          </div>
          <span
            className={`flex items-center gap-2 rounded-full border border-current/20 bg-current/10 px-3 py-1.5 text-xs font-bold ${stateLabel[state].color}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {stateLabel[state].text}
          </span>
        </header>

        <section className="mt-6 rounded-2xl border border-brand-teal/15 bg-brand-card/50 p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-ice/60">
            Kontrol
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={startDraw}
              disabled={busy || state !== "idle" || (snapshot?.participants.length ?? 0) === 0}
              className="rounded-xl bg-gradient-to-r from-brand-teal to-brand-cyan px-5 py-3 text-sm font-bold text-brand-night shadow-glow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-30"
            >
              Çekilişi Başlat
            </button>
            <button
              onClick={revealWinner}
              disabled={busy || state !== "drawing"}
              className="rounded-xl bg-gradient-to-r from-amber-300 to-amber-200 px-5 py-3 text-sm font-bold text-amber-900 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-30"
            >
              Sonucu Göster
            </button>
            <button
              onClick={nextDraw}
              disabled={busy || state !== "finished"}
              className="rounded-xl bg-gradient-to-r from-brand-violet to-brand-indigo px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-30"
            >
              Yeni Çekiliş
            </button>
            <button
              onClick={resetAll}
              disabled={busy}
              className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-5 py-3 text-sm font-bold text-rose-200 transition hover:bg-rose-500/20 active:scale-[0.98] disabled:opacity-30"
            >
              Tümünü Sıfırla
            </button>
          </div>
          {message && (
            <p className="mt-4 rounded-xl border border-brand-teal/20 bg-brand-teal/5 p-3 text-sm text-brand-ice/80">
              {message}
            </p>
          )}
          {snapshot?.winner && state !== "idle" && (
            <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-amber-100">
              <strong className="font-bold">Kazanan:</strong> {snapshot.winner.name}
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-brand-teal/15 bg-brand-card/50 p-6 backdrop-blur-xl">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-brand-ice/60">
            Manuel Katılımcı Ekle
          </h2>
          <p className="text-xs text-brand-ice/50">
            QR'a erişimi olmayan biri için elle ekle.
          </p>
          <form onSubmit={addManual} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Ad"
              maxLength={40}
              required
              disabled={busy || state !== "idle"}
              className="rounded-xl border border-brand-teal/15 bg-brand-night/60 px-4 py-2.5 text-sm text-brand-ice placeholder:text-brand-ice/30 outline-none focus:border-brand-teal disabled:opacity-40"
            />
            <input
              type="text"
              value={manualSurname}
              onChange={(e) => setManualSurname(e.target.value)}
              placeholder="Soyad"
              maxLength={40}
              required
              disabled={busy || state !== "idle"}
              className="rounded-xl border border-brand-teal/15 bg-brand-night/60 px-4 py-2.5 text-sm text-brand-ice placeholder:text-brand-ice/30 outline-none focus:border-brand-teal disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={busy || state !== "idle" || !manualName.trim() || !manualSurname.trim()}
              className="rounded-xl bg-gradient-to-r from-brand-teal to-brand-cyan px-5 py-2.5 text-sm font-bold text-brand-night transition hover:brightness-110 disabled:opacity-40"
            >
              Ekle
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-brand-teal/15 bg-brand-card/50 p-6 backdrop-blur-xl">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-brand-ice/60">
            Toplu İçe Aktar
          </h2>
          <p className="text-xs text-brand-ice/50">
            Sheets/Excel/CSV'den isim listesi yapıştır veya dosya yükle. Her satır bir
            kişi. Header satırı (Ad Soyad, Sıra…) otomatik atlanır.
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            disabled={busy || state !== "idle"}
            rows={6}
            placeholder={`Ali Yılmaz\nAyşe Demir\nMehmet Çelik\n…`}
            className="mt-3 w-full rounded-xl border border-brand-teal/15 bg-brand-night/60 p-3 text-sm text-brand-ice placeholder:text-brand-ice/30 outline-none focus:border-brand-teal disabled:opacity-40"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label
              className={`cursor-pointer rounded-xl border border-brand-teal/30 bg-brand-teal/10 px-4 py-2 text-xs font-semibold text-brand-teal transition hover:bg-brand-teal/20 ${
                busy || state !== "idle" ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Dosya Seç (.csv .txt)
              <input
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="hidden"
                disabled={busy || state !== "idle"}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              onClick={addBulk}
              disabled={busy || state !== "idle" || bulkText.trim().length === 0}
              className="rounded-xl bg-gradient-to-r from-brand-violet to-brand-indigo px-5 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              {bulkText.trim() ? `İçe Aktar (${parseBulkLines(bulkText).length} kişi)` : "İçe Aktar"}
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-brand-teal/15 bg-brand-card/50 p-6 backdrop-blur-xl">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-brand-ice/60">
            Dışa Aktar
          </h2>
          <p className="text-xs text-brand-ice/50">
            Katılımcıları CSV olarak indir veya Google Sheets'e canlı bağla.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={downloadCsv}
              className="rounded-xl border border-brand-teal/30 bg-brand-teal/10 px-4 py-2.5 text-sm font-bold text-brand-teal transition hover:bg-brand-teal/20"
            >
              CSV İndir
            </button>
            <button
              onClick={copySheetsFormula}
              className="rounded-xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-2.5 text-sm font-bold text-brand-cyan transition hover:bg-brand-cyan/20"
            >
              Sheets Formülü Kopyala
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-brand-ice/40">
            <strong className="text-brand-ice/60">Sheets'e canlı bağlamak için:</strong> Yeni
            bir Google Sheets aç, A1 hücresine "Sheets Formülü Kopyala" ile aldığın formülü
            yapıştır. Sheet katılımcıları otomatik çeker, ~1 saatte bir yeniler. Manuel
            yenilemek için A1'e tıklayıp Enter'a bas.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-brand-teal/15 bg-brand-card/50 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-ice/60">
              Katılımcılar
            </h2>
            <span className="rounded-full border border-brand-teal/30 bg-brand-teal/10 px-3 py-0.5 text-sm font-bold text-brand-teal">
              {snapshot?.participants.length ?? 0}
            </span>
          </div>
          {!snapshot || snapshot.participants.length === 0 ? (
            <p className="text-sm text-brand-ice/40">Henüz kayıt yok.</p>
          ) : (
            <ul className="divide-y divide-brand-teal/10">
              {snapshot.participants.map((p, idx) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-ink text-xs font-bold text-brand-ice/50">
                      {idx + 1}
                    </span>
                    <span className="text-brand-ice">{p.name}</span>
                  </span>
                  <button
                    onClick={() => removeParticipant(p.id, p.name)}
                    disabled={busy || state !== "idle"}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-30"
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
