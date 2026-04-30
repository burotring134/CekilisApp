"use client";

import { useState } from "react";
import Image from "next/image";

type Status = "ready" | "submitting" | "success" | "locked" | "error";

export default function JoinPage() {
  const [status, setStatus] = useState<Status>("ready");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [savedName, setSavedName] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, surname }),
      });
      const data = await res.json();
      if (data.ok) {
        setSavedName(`${name.trim()} ${surname.trim()}`);
        setStatus("success");
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
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, rgba(77,217,214,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 100%, rgba(99,102,241,0.15) 0%, transparent 50%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {status !== "success" && (
          <header className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-5 h-24 w-24 overflow-hidden rounded-3xl bg-brand-night ring-2 ring-brand-teal/60 shadow-glow float">
              <Image
                src="/mascot-face.jpg"
                alt="Maskot"
                fill
                sizes="96px"
                className="object-cover object-top"
                priority
              />
            </div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-brand-teal">
              Security Day IV
            </p>
            <h1 className="mt-2 bg-gradient-to-r from-brand-ice via-brand-teal to-brand-cyan bg-clip-text text-3xl font-bold text-transparent">
              Çekilişe Katıl
            </h1>
            <p className="mt-2 text-sm text-brand-ice/60">
              Adını ve soyadını yaz, çekilişe dahil ol.
            </p>
          </header>
        )}

        {(status === "ready" || status === "submitting" || status === "error") && (
          <Card>
            <form onSubmit={submit}>
              <Field
                label="Ad"
                value={name}
                onChange={setName}
                placeholder="Adın"
                autoFocus
              />
              <Field
                label="Soyad"
                value={surname}
                onChange={setSurname}
                placeholder="Soyadın"
                className="mt-4"
              />
              {errorMessage && (
                <p className="mt-3 text-sm text-rose-300">{errorMessage}</p>
              )}
              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-brand-teal to-brand-cyan px-4 py-3.5 text-base font-bold text-brand-night shadow-glow-sm transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
              >
                {status === "submitting" ? "Gönderiliyor…" : "Katıl"}
              </button>
            </form>
          </Card>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="absolute -inset-6 rounded-full bg-brand-teal/30 blur-2xl" />
              <div className="relative h-32 w-32 overflow-hidden rounded-full bg-brand-night ring-4 ring-brand-teal shadow-glow float">
                <Image
                  src="/mascot-face.jpg"
                  alt="Maskot"
                  fill
                  sizes="128px"
                  className="object-cover object-top"
                  priority
                />
              </div>
              <div className="absolute -right-2 -top-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal text-2xl font-bold text-brand-night shadow-glow ring-4 ring-brand-night">
                ✓
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-brand-teal">
              Security Day IV
            </p>
            <h1 className="mt-2 bg-gradient-to-r from-brand-ice via-brand-teal to-brand-cyan bg-clip-text text-4xl font-bold text-transparent">
              Kaydoldun!
            </h1>
            <p className="mt-3 text-base text-brand-ice/80">
              <span className="font-semibold text-brand-teal">{savedName}</span>
            </p>
            <p className="mt-1 text-sm text-brand-ice/50">
              Ana ekrandaki listede gözükeceksin. Bol şans! 🍀
            </p>
          </div>
        )}

        {status === "locked" && (
          <Card accent="rose">
            <div className="text-center">
              <h2 className="text-xl font-bold text-brand-ice">Çekiliş başladı</h2>
              <p className="mt-1 text-sm text-brand-ice/60">
                Yeni katılım kapandı. Bir dahaki sefere!
              </p>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

function Card({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: "teal" | "rose";
}) {
  const accentStyles: Record<string, string> = {
    teal: "border-brand-teal/40 bg-brand-teal/5",
    rose: "border-rose-300/40 bg-rose-300/5",
  };
  const style = accent ? accentStyles[accent] : "border-brand-teal/15 bg-brand-card/60";
  return (
    <div className={`rounded-2xl border p-6 backdrop-blur-xl ${style}`}>{children}</div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-ice/50">
        {label}
      </label>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={40}
        required
        className="mt-1.5 w-full rounded-xl border border-brand-teal/15 bg-brand-night/60 px-4 py-3 text-base text-brand-ice placeholder:text-brand-ice/30 outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/30"
        placeholder={placeholder}
      />
    </div>
  );
}

function humanizeReason(reason?: string): string {
  switch (reason) {
    case "missing-name":
      return "Ad ve soyad zorunlu.";
    case "name-too-long":
      return "İsim çok uzun, kısaltır mısın?";
    default:
      return "Bir şeyler ters gitti, tekrar dene.";
  }
}
