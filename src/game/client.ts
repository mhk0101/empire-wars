// انواع داده مشترک سمت کلاینت

export interface Player {
  id: number;
  username: string;
  nameChosen: boolean;
  gold: number;
  food: number;
  stone: number;
  iron: number;
  gems: number;
  level: number;
  xp: number;
  power: number;
  clanRole: string;
  buildings: Record<string, number>;
  troops: Record<string, number>;
  research: Record<string, number>;
  clanId: number | null;
  vipUntil: string | null;
  boosterUntil: string | null;
  shieldUntil: string | null;
  dailyStreak: number;
  lastDailyClaim: string | null;
  inviteCode: string;
  invitedBy: number | null;
  inviteCount: number;
  attacksWon: number;
  attacksLost: number;
  totalGoldEarned: number;
  citySkin: string;
  profileSkin: string;
  ownedSkins: string[];
}

export interface BuildJob {
  id: number;
  playerId: number;
  building: string;
  toLevel: number;
  startedAt: string;
  finishAt: string;
}
export interface TrainJob {
  id: number;
  playerId: number;
  troop: string;
  quantity: number;
  startedAt: string;
  finishAt: string;
}

export function fa(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString("fa-IR");
}

// قالب‌بندی شمارش معکوس به فارسی
export function countdown(finishAtIso: string, nowMs: number): string {
  const remain = Math.max(0, Math.floor((new Date(finishAtIso).getTime() - nowMs) / 1000));
  if (remain <= 0) return "آماده ✅";
  const h = Math.floor(remain / 3600);
  const m = Math.floor((remain % 3600) / 60);
  const s = remain % 60;
  const pad = (n: number) => n.toLocaleString("fa-IR", { minimumIntegerDigits: 2 });
  if (h > 0) return `${fa(h)}:${pad(m)}:${pad(s)}`;
  return `${fa(m)}:${pad(s)}`;
}

export function faShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", "٫") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".", "٫") + "K";
  return fa(n);
}

// توکن دستگاه پایدار در localStorage (قابل اعتماد در وب‌ویو تلگرام، برخلاف کوکی)
const TOKEN_KEY = "ew_device_token";

export function getDeviceToken(): string {
  if (typeof window === "undefined") return "";
  let t = "";
  try {
    t = window.localStorage.getItem(TOKEN_KEY) || "";
    if (!t) {
      t =
        (window.crypto?.randomUUID?.() as string) ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(TOKEN_KEY, t);
    }
  } catch {
    // اگر localStorage در دسترس نبود، توکن موقت
    t = t || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return t;
}

function authHeaders(extra: Record<string, string> = {}) {
  return { "x-ew-token": getDeviceToken(), ...extra };
}

// تجزیه امن JSON: اگر پاسخ خالی یا غیر-JSON بود، کرش نکن
/* eslint-disable @typescript-eslint/no-explicit-any */
async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) {
    return {
      error:
        res.status >= 500
          ? "خطای سرور — احتمالاً جدول‌های دیتابیس ساخته نشده‌اند. دستور «npx drizzle-kit push» را اجرا کن."
          : `خطا (کد ${res.status})`,
    };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { error: "پاسخ نامعتبر از سرور دریافت شد." };
  }
}

export async function post(url: string, body: object): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await safeJson(res);
  if (!res.ok) {
    const err = new Error(data?.error || "خطا رخ داد") as Error & {
      data?: Record<string, unknown>;
    };
    err.data = data;
    throw err;
  }
  return data;
}

export async function getJSON(url: string): Promise<any> {
  const res = await fetch(url, { headers: authHeaders() });
  return safeJson(res);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
