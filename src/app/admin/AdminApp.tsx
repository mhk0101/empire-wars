"use client";

import { useCallback, useEffect, useState } from "react";

function fa(n: number) {
  return (n ?? 0).toLocaleString("fa-IR");
}

interface PayReq {
  id: number;
  playerId: number;
  username: string;
  gems: number;
  amount: string;
  payerName: string;
  refCode: string;
  status: string;
  createdAt: string;
}

interface PlayerRow {
  id: number;
  username: string;
  level: number;
  power: number;
  gold: number;
  gems: number;
  banned: boolean;
  attacksWon: number;
}

interface Stats {
  totalPlayers: number;
  totalClans: number;
  totalBattles: number;
  banned: number;
  pendingPays: number;
  online: number;
}

export default function AdminApp() {
  const [pass, setPass] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<
    "stats" | "players" | "payments" | "settings" | "announce"
  >("stats");
  const [settingsData, setSettingsData] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  const [stats, setStats] = useState<Stats | null>(null);
  const [reqs, setReqs] = useState<PayReq[]>([]);
  const [payFilter, setPayFilter] = useState("pending");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  // فرم اطلاع‌رسانی
  const [annTarget, setAnnTarget] = useState<"all" | "user">("all");
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [annUser, setAnnUser] = useState("");
  const [annInApp, setAnnInApp] = useState(true); // پاپ‌آپ داخل بازی
  const [annTelegram, setAnnTelegram] = useState(false); // پیام تلگرام
  const [sending, setSending] = useState(false);
  // لیست پیام‌های ذخیره‌شده
  const [msgList, setMsgList] = useState<
    {
      id: string;
      kind: string;
      title: string;
      message: string;
      target: string;
      createdAt: string;
    }[]
  >([]);

  const api = useCallback(
    async (path: string, opts: RequestInit = {}) => {
      const res = await fetch(`/api/admin${path}`, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          "x-admin-pass": pass,
          ...(opts.headers || {}),
        },
      });
      if (res.status === 401) {
        setAuthed(false);
        throw new Error("رمز اشتباه");
      }
      return res.json();
    },
    [pass]
  );

  const loadStats = useCallback(async () => {
    const d = await api("?view=stats");
    setStats(d.stats);
  }, [api]);
  const loadPayments = useCallback(async () => {
    const d = await api("?view=payments");
    setReqs(d.requests || []);
  }, [api]);
  const loadPlayers = useCallback(
    async (q = "") => {
      const d = await api(`?view=players&q=${encodeURIComponent(q)}`);
      setPlayers(d.players || []);
    },
    [api]
  );

  async function login() {
    try {
      const res = await fetch("/api/admin?view=stats", {
        headers: { "x-admin-pass": pass },
      });
      if (res.status === 401) {
        setMsg("رمز اشتباه است.");
        return;
      }
      const d = await res.json();
      setStats(d.stats);
      setAuthed(true);
      setMsg("");
      sessionStorage.setItem("ew_admin_pass", pass);
    } catch {
      setMsg("خطا در اتصال.");
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("ew_admin_pass");
    if (saved) setPass(saved);
  }, []);

  useEffect(() => {
    if (!authed) return;
    if (tab === "stats") loadStats();
    if (tab === "payments") loadPayments();
    if (tab === "players") loadPlayers(search);
    if (tab === "announce") loadMessages();
    if (tab === "settings")
      api("?view=settings").then((d) => setSettingsData(d.settings || {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, tab]);

  async function saveSettingsAdmin() {
    const d = await api("", {
      method: "POST",
      body: JSON.stringify({ action: "saveSettings", settings: settingsData }),
    });
    if (d.error) setMsg("خطا: " + d.error);
    else setMsg("تنظیمات ذخیره شد ✅");
  }

  async function review(id: number, action: string) {
    await api("", { method: "POST", body: JSON.stringify({ id, action }) });
    setMsg(action === "approve" ? "تأیید شد ✅" : "رد شد ❌");
    loadPayments();
    loadStats();
  }

  // ارسال پیام همگانی یا اختصاصی — با انتخاب کانال (داخل بازی / تلگرام)
  async function sendAnnouncement() {
    if (!annTitle.trim() || !annMessage.trim()) {
      setMsg("عنوان و متن پیام الزامی است.");
      return;
    }
    if (annTarget === "user" && !annUser.trim()) {
      setMsg("نام کاربری گیرنده را وارد کنید.");
      return;
    }
    if (!annInApp && !annTelegram) {
      setMsg("حداقل یک روش ارسال را انتخاب کنید.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pass": pass,
        },
        body: JSON.stringify({
          title: annTitle.trim(),
          message: annMessage.trim(),
          target: annTarget,
          username: annUser.trim() || undefined,
          channels: { inApp: annInApp, telegram: annTelegram },
        }),
      });
      const d = await res.json();
      if (d.error) {
        setMsg("خطا: " + d.error);
        return;
      }
      // ساخت گزارش خوانا از روش و تعداد ارسال
      const parts: string[] = [];
      if (d.inAppDelivered === -1) parts.push("پاپ‌آپ برای همه");
      else if (d.inAppDelivered > 0) parts.push(`پاپ‌آپ برای «${d.target}»`);
      if (d.telegramSent > 0) parts.push(`${d.telegramSent} پیام تلگرام`);
      if (d.telegramSkipped > 0)
        parts.push(`${d.telegramSkipped} کاربر بدون تلگرام`);
      const summary = parts.length ? parts.join(" • ") : "ارسال شد";
      setMsg(`✅ ${summary}`);
      if (!d.error) {
        setAnnTitle("");
        setAnnMessage("");
        if (d.mode === "user") setAnnUser("");
        loadMessages();
      }
    } catch {
      setMsg("خطا در ارسال پیام.");
    } finally {
      setSending(false);
    }
  }

  // بارگذاری پیام‌های ذخیره‌شده (همگانی و اختصاصی)
  async function loadMessages() {
    try {
      const res = await fetch("/api/admin/broadcast?list=1", {
        headers: { "x-admin-pass": pass },
      });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const d = await res.json();
      const all = [
        ...(d.broadcasts || []),
        ...(d.targeted || []),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setMsgList(all);
    } catch {
      // بی‌صدا
    }
  }

  // حذف یک پیام
  async function deleteMessage(id: string) {
    if (!confirm("این پیام حذف شود؟")) return;
    try {
      const res = await fetch(`/api/admin/broadcast?id=${id}`, {
        method: "DELETE",
        headers: { "x-admin-pass": pass },
      });
      const d = await res.json();
      if (d.error) {
        setMsg("خطا: " + d.error);
        return;
      }
      setMsg("پیام حذف شد 🗑️");
      loadMessages();
    } catch {
      setMsg("خطا در حذف پیام.");
    }
  }

  async function playerAction(playerId: number, action: string, extra: object = {}) {
    const d = await api("", {
      method: "POST",
      body: JSON.stringify({ action, playerId, ...extra }),
    });
    if (d.error) {
      setMsg("خطا: " + d.error);
      return;
    }
    setMsg("انجام شد ✅");
    loadPlayers(search);
  }

  // ---- صفحه ورود ----
  if (!authed) {
    return (
      <main
        dir="rtl"
        className="grid min-h-screen place-items-center bg-[#0a0e1a] px-6 text-slate-100"
      >
        <div className="card-gold card w-full max-w-sm rounded-3xl p-6 text-center">
          <div className="mb-3 text-5xl">🔐</div>
          <h1 className="text-xl font-black gold-text">پنل مدیریت</h1>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="رمز عبور ادمین"
            className="mt-4 w-full rounded-xl border border-white/10 bg-[#0a0e1a] px-3 py-3 text-center"
          />
          {msg && <p className="mt-2 text-xs text-rose-400">{msg}</p>}
          <button
            onClick={login}
            className="btn-gold mt-4 w-full rounded-xl py-3 text-sm"
          >
            ورود
          </button>
        </div>
      </main>
    );
  }

  const filteredPays = reqs.filter(
    (r) => payFilter === "all" || r.status === payFilter
  );

  return (
    <main dir="rtl" className="min-h-screen bg-[#0a0e1a] px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-black gold-text">👑 پنل مدیریت Empire Wars</h1>
          <button
            onClick={() => {
              sessionStorage.removeItem("ew_admin_pass");
              setAuthed(false);
            }}
            className="text-xs text-slate-400"
          >
            خروج
          </button>
        </div>

        {msg && (
          <p className="mb-3 rounded-lg bg-[#1a2440] px-3 py-2 text-xs text-emerald-300">
            {msg}
          </p>
        )}

        {/* تب‌ها */}
        <div className="mb-4 flex gap-2">
          {[
            ["stats", "📊 آمار"],
            ["players", "👥 کاربران"],
            ["payments", "💎 پرداخت‌ها"],
            ["announce", "📣 اطلاع‌رسانی"],
            ["settings", "⚙️ تنظیمات"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id as typeof tab)}
              className={`flex-1 rounded-xl py-2 text-[11px] font-bold ${
                tab === id ? "btn-gold" : "card text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* آمار */}
        {tab === "stats" && stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="👥 کل کاربران" value={fa(stats.totalPlayers)} />
            <StatCard label="🟢 آنلاین" value={fa(stats.online)} />
            <StatCard label="👑 کلن‌ها" value={fa(stats.totalClans)} />
            <StatCard label="⚔️ نبردها" value={fa(stats.totalBattles)} />
            <StatCard label="🚫 مسدود" value={fa(stats.banned)} />
            <StatCard
              label="💎 پرداخت در انتظار"
              value={fa(stats.pendingPays)}
            />
          </div>
        )}

        {/* کاربران */}
        {tab === "players" && (
          <div>
            <div className="mb-3 flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadPlayers(search)}
                placeholder="جستجو نام یا آیدی کاربر…"
                className="flex-1 rounded-xl border border-white/10 bg-[#121a2e] px-3 py-2 text-sm"
              />
              <button
                onClick={() => loadPlayers(search)}
                className="btn-gold rounded-xl px-4 text-sm"
              >
                جستجو
              </button>
            </div>

            <div className="space-y-2">
              {players.map((pl) => (
                <div
                  key={pl.id}
                  className="rounded-2xl border border-white/10 bg-[#121a2e] p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold">
                        {pl.banned && "🚫 "}
                        {pl.username}
                      </span>
                      <span className="mr-2 text-[11px] text-slate-400">
                        #{pl.id} • سطح {fa(pl.level)} • ⚡{fa(pl.power)}
                      </span>
                    </div>
                    <div className="text-left text-[11px] text-slate-300">
                      💰{fa(pl.gold)} • 💎{fa(pl.gems)}
                    </div>
                  </div>

                  {editId === pl.id ? (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-5 gap-1">
                        {["gold", "food", "stone", "iron", "gems"].map((k) => (
                          <input
                            key={k}
                            placeholder={k}
                            value={editForm[k] ?? ""}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, [k]: e.target.value }))
                            }
                            className="w-full rounded bg-[#0a0e1a] px-1 py-1 text-center text-[10px]"
                          />
                        ))}
                      </div>
                      <input
                        placeholder="نام جدید (اختیاری)"
                        value={editForm.username ?? ""}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, username: e.target.value }))
                        }
                        className="w-full rounded bg-[#0a0e1a] px-2 py-1 text-xs"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={async () => {
                            if (editForm.username && editForm.username.length >= 3)
                              await playerAction(pl.id, "rename", {
                                username: editForm.username,
                              });
                            await playerAction(pl.id, "setResources", editForm);
                            setEditId(null);
                            setEditForm({});
                          }}
                          className="flex-1 rounded bg-emerald-600 py-1.5 text-xs font-bold"
                        >
                          ذخیره
                        </button>
                        <button
                          onClick={() => {
                            setEditId(null);
                            setEditForm({});
                          }}
                          className="flex-1 rounded bg-slate-600 py-1.5 text-xs"
                        >
                          لغو
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        onClick={() => {
                          setEditId(pl.id);
                          setEditForm({});
                        }}
                        className="rounded bg-[#1a2440] px-2 py-1 text-[11px] text-sky-300"
                      >
                        ✏️ ویرایش
                      </button>
                      <button
                        onClick={() =>
                          playerAction(pl.id, pl.banned ? "unban" : "ban")
                        }
                        className={`rounded px-2 py-1 text-[11px] ${
                          pl.banned
                            ? "bg-emerald-900/40 text-emerald-300"
                            : "bg-amber-900/40 text-amber-300"
                        }`}
                      >
                        {pl.banned ? "✅ رفع مسدودی" : "🚫 مسدود"}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`کاربر ${pl.username} حذف شود؟`))
                            playerAction(pl.id, "delete");
                        }}
                        className="rounded bg-rose-900/40 px-2 py-1 text-[11px] text-rose-300"
                      >
                        🗑 حذف
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {players.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  کاربری یافت نشد.
                </p>
              )}
            </div>
          </div>
        )}

        {/* پرداخت‌ها */}
        {tab === "payments" && (
          <div>
            <div className="mb-3 flex gap-2">
              {[
                ["pending", "در انتظار"],
                ["approved", "تأییدشده"],
                ["rejected", "ردشده"],
                ["all", "همه"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setPayFilter(id)}
                  className={`rounded-lg px-3 py-1.5 text-xs ${
                    payFilter === id
                      ? "bg-[#f5c542] font-bold text-[#1a1206]"
                      : "bg-[#1a2440] text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={loadPayments}
                className="mr-auto rounded-lg bg-[#1a2440] px-3 py-1.5 text-xs text-slate-300"
              >
                🔄
              </button>
            </div>

            <div className="space-y-2">
              {filteredPays.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-white/10 bg-[#121a2e] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">{r.username}</div>
                      <div className="text-[11px] text-slate-400">
                        #{r.playerId} •{" "}
                        {new Date(r.createdAt).toLocaleString("fa-IR")}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-[#f5c542]">💎 {fa(r.gems)}</div>
                      <div className="text-[11px] text-slate-300">
                        {fa(Number(r.amount))} تومان
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-[#0a0e1a] p-2 text-[11px]">
                    <span>واریزکننده: <b>{r.payerName}</b></span>
                    <span>پیگیری: <b dir="ltr">{r.refCode}</b></span>
                  </div>
                  {r.status === "pending" ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => review(r.id, "approve")}
                        className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-bold"
                      >
                        ✅ تأیید
                      </button>
                      <button
                        onClick={() => review(r.id, "reject")}
                        className="flex-1 rounded-xl bg-rose-600 py-2 text-sm font-bold"
                      >
                        ❌ رد
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`mt-3 rounded-lg py-2 text-center text-xs font-bold ${
                        r.status === "approved"
                          ? "bg-emerald-900/40 text-emerald-300"
                          : "bg-rose-900/40 text-rose-300"
                      }`}
                    >
                      {r.status === "approved" ? "✅ تأیید شده" : "❌ رد شده"}
                    </div>
                  )}
                </div>
              ))}
              {filteredPays.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  موردی نیست.
                </p>
              )}
            </div>
          </div>
        )}

        {/* اطلاع‌رسانی: پیام قابل‌پیکربندی */}
        {tab === "announce" && (
          <div className="space-y-4">
            {/* گام ۱: گیرنده — همه یا یک کاربر خاص */}
            <div className="rounded-2xl border border-white/10 bg-[#121a2e] p-4">
              <h3 className="mb-3 text-xs font-bold text-[#f5c542]">
                ۱) گیرنده پیام
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAnnTarget("all")}
                  className={`rounded-xl py-2.5 text-xs font-bold ${
                    annTarget === "all"
                      ? "btn-gold"
                      : "card text-slate-300"
                  }`}
                >
                  📢 همه‌ی بازیکنان
                </button>
                <button
                  onClick={() => setAnnTarget("user")}
                  className={`rounded-xl py-2.5 text-xs font-bold ${
                    annTarget === "user"
                      ? "btn-gold"
                      : "card text-slate-300"
                  }`}
                >
                  📨 یک کاربر خاص
                </button>
              </div>
              {annTarget === "user" && (
                <label className="mt-3 block text-[11px] text-slate-400">
                  نام کاربری گیرنده
                  <input
                    value={annUser}
                    onChange={(e) => setAnnUser(e.target.value)}
                    placeholder="مثلاً: سردار_۱۲۳۴"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-3 py-2 text-sm text-slate-100"
                  />
                </label>
              )}
            </div>

            {/* گام ۲: روش ارسال — داخل بازی / تلگرام */}
            <div className="rounded-2xl border border-white/10 bg-[#121a2e] p-4">
              <h3 className="mb-3 text-xs font-bold text-[#f5c542]">
                ۲) روش ارسال (انتخاب کنید)
              </h3>
              <div className="space-y-2">
                <ChannelToggle
                  active={annInApp}
                  onClick={() => setAnnInApp((v) => !v)}
                  icon="📱"
                  title="پاپ‌آپ داخل بازی"
                  desc={
                    annTarget === "all"
                      ? "برای همه به‌صورت پاپ‌آپ نمایش داده می‌شود (تا کاربر ببندد)."
                      : "فقط برای این کاربر به‌صورت پاپ‌آپ نمایش داده می‌شود."
                  }
                />
                <ChannelToggle
                  active={annTelegram}
                  onClick={() => setAnnTelegram((v) => !v)}
                  icon="✈️"
                  title="پیام تلگرام"
                  desc={
                    annTarget === "all"
                      ? "به همه‌ی کاربرانی که ربات را استارت کرده‌اند ارسال می‌شود."
                      : "به تلگرام این کاربر ارسال می‌شود (اگر متصل باشد)."
                  }
                />
              </div>
              {!annInApp && !annTelegram && (
                <p className="mt-2 text-[11px] text-rose-400">
                  حداقل یک روش ارسال را فعال کنید.
                </p>
              )}
            </div>

            {/* گام ۳: محتوای پیام */}
            <div className="rounded-2xl border border-white/10 bg-[#121a2e] p-4 space-y-3">
              <h3 className="text-xs font-bold text-[#f5c542]">
                ۳) محتوای پیام
              </h3>
              <label className="block text-[11px] text-slate-400">
                عنوان پیام
                <input
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="موضوع پیام"
                  maxLength={120}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-3 py-2 text-sm text-slate-100"
                />
              </label>

              <label className="block text-[11px] text-slate-400">
                متن پیام
                <textarea
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  placeholder="متن پیام خود را بنویسید…"
                  rows={5}
                  className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-[#0a0e1a] px-3 py-2 text-sm text-slate-100"
                />
              </label>

              <button
                onClick={sendAnnouncement}
                disabled={sending}
                className="btn-gold w-full rounded-xl py-3 text-sm"
              >
                {sending
                  ? "در حال ارسال…"
                  : annTarget === "all"
                    ? "📢 ارسال پیام"
                    : "📨 ارسال پیام"}
              </button>
            </div>

            {/* لیست پیام‌های ذخیره‌شده با امکان حذف */}
            <div className="rounded-2xl border border-white/10 bg-[#121a2e] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#f5c542]">
                  📥 پیام‌های ذخیره‌شده ({fa(msgList.length)})
                </h3>
                <button
                  onClick={loadMessages}
                  className="text-[10px] text-slate-400"
                >
                  🔄 بازخوانی
                </button>
              </div>

              {msgList.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-slate-500">
                  هنوز پیامی ارسال نشده است.
                </p>
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {msgList.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-white/5 bg-[#0a0e1a] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-100">
                              {m.title}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                m.kind === "all"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-sky-500/20 text-sky-300"
                              }`}
                            >
                              {m.kind === "all" ? "📢 همگانی" : "📨 اختصاصی"}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">
                            {m.message}
                          </p>
                          <div className="mt-1 text-[10px] text-slate-500">
                            به: {m.target} •{" "}
                            {new Date(m.createdAt).toLocaleString("fa-IR")}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteMessage(m.id)}
                          className="shrink-0 rounded-lg bg-rose-500/10 px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-500/20"
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* تنظیمات */}
        {tab === "settings" && (
          <div className="space-y-5">
            <SettingsGroup title="💳 پرداخت">
              <SettingField label="شماره کارت" k="paymentCard" data={settingsData} set={setSettingsData} />
              <SettingField label="نام صاحب حساب" k="paymentCardHolder" data={settingsData} set={setSettingsData} />
            </SettingsGroup>

            <SettingsGroup title="🔐 امنیت">
              <SettingField label="رمز پنل ادمین" k="adminPassword" data={settingsData} set={setSettingsData} />
            </SettingsGroup>

            <SettingsGroup title="🎁 جایزه ورود روزانه (طلا)">
              <SettingField label="روز ۱" k="daily1" data={settingsData} set={setSettingsData} num />
              <SettingField label="روز ۲" k="daily2" data={settingsData} set={setSettingsData} num />
              <SettingField label="روز ۳" k="daily3" data={settingsData} set={setSettingsData} num />
              <SettingField label="روز ۴" k="daily4" data={settingsData} set={setSettingsData} num />
              <SettingField label="روز ۵" k="daily5" data={settingsData} set={setSettingsData} num />
              <SettingField label="روز ۶" k="daily6" data={settingsData} set={setSettingsData} num />
              <SettingField label="روز ۷ (جم)" k="daily7Gems" data={settingsData} set={setSettingsData} num />
            </SettingsGroup>

            <SettingsGroup title="🤝 پاداش دعوت">
              <SettingField label="طلا به دعوت‌کننده" k="inviteGold" data={settingsData} set={setSettingsData} num />
              <SettingField label="جم به دعوت‌کننده" k="inviteGems" data={settingsData} set={setSettingsData} num />
              <SettingField label="طلا به تازه‌وارد" k="inviteGoldNew" data={settingsData} set={setSettingsData} num />
              <SettingField label="جم به تازه‌وارد" k="inviteGemsNew" data={settingsData} set={setSettingsData} num />
              <SettingField label="سقف دعوت روزانه" k="inviteDailyLimit" data={settingsData} set={setSettingsData} num />
            </SettingsGroup>

            <SettingsGroup title="💎 قیمت بسته‌های جم (تومان)">
              <SettingField label="بسته ۱۰۰ جم" k="gemPack1Price" data={settingsData} set={setSettingsData} num />
              <SettingField label="بسته ۵۰۰ جم" k="gemPack2Price" data={settingsData} set={setSettingsData} num />
              <SettingField label="بسته ۱۰۰۰ جم" k="gemPack3Price" data={settingsData} set={setSettingsData} num />
            </SettingsGroup>

            <button
              onClick={saveSettingsAdmin}
              className="btn-gold w-full rounded-xl py-3 text-sm"
            >
              💾 ذخیره همه تنظیمات
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#121a2e] p-4">
      <h3 className="mb-3 text-sm font-bold text-[#f5c542]">{title}</h3>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function SettingField({
  label,
  k,
  data,
  set,
  num,
}: {
  label: string;
  k: string;
  data: Record<string, string>;
  set: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  num?: boolean;
}) {
  return (
    <label className="block text-[11px] text-slate-400">
      {label}
      <input
        type={num ? "number" : "text"}
        value={data[k] ?? ""}
        onChange={(e) => set((d) => ({ ...d, [k]: e.target.value }))}
        className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-2 py-2 text-sm text-slate-100"
      />
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#f5c542]/20 bg-[#121a2e] p-4 text-center">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-black text-[#f5c542]">{value}</div>
    </div>
  );
}

// دکمه‌ی انتخاب روش ارسال (کانال) — قابل روشن/خاموش
function ChannelToggle({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-right transition ${
        active
          ? "border-[#f5c542]/50 bg-[#f5c542]/10"
          : "border-white/10 bg-[#0a0e1a]"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="flex-1">
        <span className="block text-xs font-bold text-slate-100">{title}</span>
        <span className="block text-[10px] leading-snug text-slate-400">
          {desc}
        </span>
      </span>
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${
          active ? "bg-[#f5c542] text-[#0a0e1a]" : "bg-white/10 text-slate-500"
        }`}
      >
        {active ? "✓" : ""}
      </span>
    </button>
  );
}
