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
    emoji: "🏰",
    title: "به Empire Wars خوش آمدی!",
    text: "در این بازی استراتژیک امپراتوری خودت را بساز، اقتصادت را توسعه بده، اتحاد تشکیل بده و بر سرور مسلط شو. این آموزش سریع را دنبال کن (یا هر لحظه ردش کن).",
    color: "from-amber-500 to-yellow-600",
  },
  {
    emoji: "🏠",
    title: "تب خانه",
    text: "منابعت (طلا، غذا، سنگ، آهن، جم) را اینجا ببین. روی «برداشت منابع» بزن تا تولیدات شهرت جمع شود. سطح و قدرتت هم اینجاست.",
    color: "from-emerald-500 to-green-600",
  },
  {
    emoji: "🏰",
    title: "تب شهر",
    text: "ساختمان‌هایت را ارتقا بده. مرکز فرماندهی مهم‌ترین ساختمان است — سطح آن سقف بقیه ساختمان‌ها را تعیین می‌کند. هر ارتقا زمان‌بر است (تایمر دارد).",
    color: "from-blue-500 to-indigo-600",
  },
  {
    emoji: "⚔️",
    title: "تب نیروها",
    text: "در پادگان سرباز، تیرانداز، شوالیه و ماشین جنگی آموزش بده. هر چه نیروی بیشتری داشته باشی، قدرت نظامی‌ات بالاتر می‌رود.",
    color: "from-rose-500 to-red-600",
  },
  {
    emoji: "🔬",
    title: "تب تحقیق",
    text: "فناوری‌های اقتصادی، نظامی و سرعت را توسعه بده. تحقیق، تولید، دفاع و قدرت حمله‌ات را برای همیشه افزایش می‌دهد.",
    color: "from-purple-500 to-violet-600",
  },
  {
    emoji: "🎯",
    title: "تب حمله",
    text: "به بازیکنان دیگر حمله کن و غنیمت بگیر! بعد از هر حمله، مدافع ۴ ساعت سپر می‌گیرد. اگر کسی به تو حمله کند، از طریق تلگرام و پاپ‌آپ داخل بازی مطلع می‌شوی.",
    color: "from-orange-500 to-amber-600",
  },
  {
    emoji: "🛡️",
    title: "کلن و رتبه",
    text: "به یک کلن بپیوند یا خودت بساز. با هم‌تیمی‌هایت چت کن و در رتبه‌بندی جهانی بالا برو. جایزه روزانه و مأموریت‌ها را فراموش نکن!",
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
          <p className="text-sm leading-relaxed text-slate-300">{s.text}</p>
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
              {isLast ? "شروع بازی! 🚀" : "بعدی ←"}
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
