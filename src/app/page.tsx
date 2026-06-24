import Link from "next/link";

export const dynamic = "force-dynamic";

const features = [
  { emoji: "🏰", title: "ساخت امپراتوری", desc: "از یک قلمرو کوچک شروع کن و شهری قدرتمند بساز." },
  { emoji: "💰", title: "توسعه اقتصاد", desc: "معادن و مزارع را ارتقا بده و ثروت بی‌پایان جمع کن." },
  { emoji: "⚔️", title: "جنگ و فتح", desc: "نیرو بساز، به دشمنان حمله کن و غنیمت بگیر." },
  { emoji: "🛡️", title: "تشکیل اتحاد", desc: "با ۵۰ بازیکن کلن بساز و در جنگ کلن‌ها بجنگ." },
  { emoji: "🔬", title: "تحقیق فناوری", desc: "در آزمایشگاه تکنولوژی‌های قدرتمند توسعه بده." },
  { emoji: "🏆", title: "تسلط بر سرور", desc: "در لیدربورد بالا برو و فرمانده برتر سرور شو." },
];

const buildings = [
  ["🏰", "مرکز فرماندهی"],
  ["🪙", "معدن طلا"],
  ["🌾", "مزرعه"],
  ["🪨", "معدن سنگ"],
  ["🏭", "کارخانه آهن"],
  ["📦", "انبار"],
  ["🛡️", "پادگان"],
  ["🔬", "آزمایشگاه"],
  ["🏪", "بازار"],
  ["🧱", "دیوار دفاعی"],
];

const loop = [
  "وارد می‌شوی",
  "منابع جمع می‌کنی",
  "ساختمان ارتقا می‌دهی",
  "نیرو می‌سازی",
  "حمله می‌کنی",
  "قوی‌تر می‌شوی",
  "در رتبه بالا می‌روی",
];

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden">
      {/* پس‌زمینه بهینه شده */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[#0a0e1a]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a2440_0%,transparent_70%)]" />
      </div>

      {/* هدر */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="text-xl font-black gold-text">👑 Empire Wars</div>
        <Link
          href="/game"
          className="btn-gold rounded-xl px-4 py-2 text-sm"
        >
          🎮 ورود به بازی
        </Link>
      </header>

      {/* هیرو */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 text-center">
        <div className="mx-auto mb-6 text-7xl sm:text-8xl">🏰</div>
        <h1 className="mx-auto max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
          امپراتوری خود را بساز،
          <br />
          <span className="gold-text">بر سرور تسلط پیدا کن</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          یک بازی استراتژیک تلگرامی به سبک Travian و OGame؛ ثروت جمع کن، اقتصادت
          را توسعه بده، اتحاد تشکیل بده و با هزاران فرمانده دیگر بجنگ. هیچ پایانی
          ندارد.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/game"
            className="btn-gold glow rounded-2xl px-8 py-4 text-lg"
          >
            🎮 شروع رایگان
          </Link>
          <a
            href="#features"
            className="rounded-2xl border border-slate-600 px-8 py-4 text-lg text-slate-200 transition hover:border-[#f5c542]/50"
          >
            بیشتر بدانید
          </a>
        </div>

        {/* منابع */}
        <div className="mx-auto mt-14 flex flex-wrap justify-center gap-3">
          {[
            ["💰", "طلا"],
            ["🌾", "غذا"],
            ["⛏️", "سنگ"],
            ["⚙️", "آهن"],
            ["💎", "جم"],
          ].map(([e, n]) => (
            <div
              key={n}
              className="card flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
            >
              <span className="text-lg">{e}</span>
              <span className="text-slate-300">{n}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ویژگی‌ها */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="mb-10 text-center text-3xl font-black">
          چه چیزی در انتظار توست؟
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="card rounded-2xl p-6 transition hover:card-gold"
            >
              <div className="mb-3 text-4xl">{f.emoji}</div>
              <h3 className="mb-2 text-lg font-bold text-[#f5c542]">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ساختمان‌ها */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="mb-3 text-center text-3xl font-black">۱۰ ساختمان قدرتمند</h2>
        <p className="mb-10 text-center text-slate-400">
          شهرت را با ساختمان‌های گوناگون توسعه بده
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {buildings.map(([e, n]) => (
            <div
              key={n}
              className="card flex flex-col items-center gap-2 rounded-2xl p-5 text-center transition hover:-translate-y-1 hover:card-gold"
            >
              <span className="text-4xl">{e}</span>
              <span className="text-sm font-semibold text-slate-200">{n}</span>
            </div>
          ))}
        </div>
      </section>

      {/* حلقه بازی */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="mb-10 text-center text-3xl font-black">حلقه بازی</h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {loop.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div className="card-gold card rounded-xl px-4 py-3 text-sm font-semibold text-slate-100">
                <span className="ml-2 text-[#f5c542]">{i + 1}.</span>
                {step}
              </div>
              {i < loop.length - 1 && (
                <span className="text-[#f5c542]">←</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-slate-400">… و دوباره برمی‌گردی 🔄</p>
      </section>

      {/* CTA پایانی */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <div className="card-gold card glow rounded-3xl p-10">
          <h2 className="text-3xl font-black gold-text">
            آماده‌ای فرمانده شوی؟
          </h2>
          <p className="mt-4 text-slate-300">
            همین حالا قلمرو خود را بساز و راه تسلط بر سرور را آغاز کن.
          </p>
          <Link
            href="/game"
            className="btn-gold mt-8 inline-block rounded-2xl px-10 py-4 text-lg"
          >
            👑 ورود به بازی
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-slate-500">
        ساخته‌شده با ❤️ — Empire Wars © ۱۴۰۵
      </footer>
    </main>
  );
}
