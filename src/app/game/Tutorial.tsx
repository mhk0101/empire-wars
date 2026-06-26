"use client";

import { useState } from "react";
import { post } from "@/game/client";

interface TutorialProps {
  onDone: () => void;
}

interface Step {
  emoji: string;
  title: string;
  text: string;
  color: string;
}

// مراحل آموزش — یکی برای هر بخش اصلی بازی
const STEPS: Step[] = [
  {
    emoji: "👑",
    title: "سلام، خوش اومدی.",
    text: "این یه بازی استراتژیه که توش یه امپراتوری برای خودت می‌سازی. می‌تونی اقتصادتو رشد بدی، با بقیه متحد بشی و کم‌کم بین بازیکن‌های سرور جای خودتو پیدا کنی. بذار قسمت‌های اصلی بازی رو برات بگم.",
    color: "from-amber-500 to-yellow-600",
  },
  {
    emoji: "🏠",
    title: "خانه",
    text: "این صفحه‌ای که الان جلوته، خونه‌ی توئه. منابعی که داری، طلا، غذا، سنگ، آهن و جم، همه اینجا نشون داده می‌شن. شهرت مدام داره منابع تولید می‌کنه. سطح و قدرت کلی رو همین‌جا می‌بینی.",
    color: "from-emerald-500 to-green-600",
  },
  {
    emoji: "🏰",
    title: "شهر",
    text: "این بخش برای ساخت‌وسازه. ساختمون‌ها رو ارتقا می‌دی تا شهرت قوی‌تر بشه. یه نکته مهم: مرکز فرماندهی سقف رشد بقیه ساختمون‌هاست، یعنی هیچ ساختمونی نمی‌تونه از سطح اون بالاتر بره. پس اول روی همین تمرکز کن. ارتقاها تایمر دارن و باید صبر کنی تا تموم بشن.",
    color: "from-blue-500 to-indigo-600",
  },
  {
    emoji: "🔬",
    title: "تحقیق",
    text: "اینجا روی فناوری‌های اقتصادی، نظامی و سرعت کار می‌کنی. هر تحقیقی که انجام بدی، تولید، دفاع یا قدرت حمله‌ات رو بیشتر می‌کنه و این افزایش‌ها دائمیه.",
    color: "from-purple-500 to-violet-600",
  },
  {
    emoji: "🎯",
    title: "حمله",
    text: "می‌تونی به بازیکن‌های دیگه حمله کنی و ازشون منابع بگیری. بعد از هر حمله، طرف ۴ ساعت سپر می‌گیره و تو این مدت نمی‌شه دوباره بهش زد. اگه کسی به تو حمله کرد، هم از تلگرام بهت اطلاع می‌دیم، هم تو خود بازی یه پیام می‌بینی.",
    color: "from-orange-500 to-amber-600",
  },
  {
    emoji: "🛡️",
    title: "کلن و رتبه",
    text: "می‌تونی به یه کلن بپیوندی یا خودت یکی بسازی. با هم تیمی هات چت می‌کنی و با هم تو رتبه‌بندی جهانی بالا می‌ری. جایزه روزانه و مأموریت‌ها رو هم یادت نره، هر روز یه چیزی برات کنار گذاشتن.",
    color: "from-cyan-500 to-teal-600",
  },
];

export default function Tutorial({ onDone }: TutorialProps) {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // بستن/تکمیل آموزش — هم در سرور و هم کلاینت
  async function finish() {
    if (closing) return;
    setClosing(true);
    try {
      await post("/api/tutorial", {});
    } catch {
      // حتی اگر ذخیره نشد، در کلاینت ببند
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="card-gold card glow relative w-full max-w-sm overflow-hidden rounded-3xl">
        {/* نوار پیشرفت مراحل */}
        <div className="flex gap-1 px-5 pt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? "bg-[#f5c542]" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* دکمه رد کردن */}
        <button
          onClick={finish}
          className="absolute left-4 top-4 z-10 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10"
        >
          رد کردن ⏭️
        </button>

        {/* محتوای مرحله */}
        <div className="p-6 text-center">
          <div
            key={step}
            className={`mx-auto mb-4 grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br ${s.color} text-6xl shadow-lg`}
            style={{ animation: "ew-pop 0.4s ease" }}
          >
            {s.emoji}
          </div>

          <h3 className="mb-2 text-lg font-black text-slate-100">{s.title}</h3>
          <p className="max-h-44 overflow-y-auto whitespace-pre-line px-1 text-sm leading-relaxed text-slate-300">
            {s.text}
          </p>
        </div>

        {/* دکمه‌های ناوبری */}
        <div className="flex items-center justify-between gap-2 px-6 pb-6">
          <span className="text-[11px] text-slate-500">
            {step + 1} از {STEPS.length}
          </span>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="card rounded-xl px-4 py-2 text-xs text-slate-300"
              >
                قبلی
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStep((v) => v + 1))}
              className="btn-gold rounded-xl px-6 py-2 text-sm"
            >
              {isLast ? "شروع کنی 🚀" : "بعدی ←"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ew-pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
