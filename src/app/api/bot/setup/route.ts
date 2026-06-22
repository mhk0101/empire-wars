export const dynamic = "force-dynamic";

// این مسیر را یک‌بار در مرورگر باز کن تا webhook ربات روی تلگرام ثبت شود:
//   https://دامنه-شما/api/bot/setup
// برای حذف وب‌هوک:  /api/bot/setup?delete=1
export async function GET(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return Response.json(
      {
        ok: false,
        error:
          "TELEGRAM_BOT_TOKEN تنظیم نشده است. در Vercel → Settings → Environment Variables آن را اضافه کن و دوباره Deploy کن.",
      },
      { status: 400 }
    );
  }

  const url = new URL(req.url);

  // حذف وب‌هوک در صورت درخواست
  if (url.searchParams.get("delete") === "1") {
    const del = await fetch(
      `https://api.telegram.org/bot${token}/deleteWebhook`
    ).then((r) => r.json());
    return Response.json({ deleted: del });
  }

  // آدرس وب‌هوک را از روی همین درخواست می‌سازیم (نیازی به تنظیم دستی نیست)
  const origin = `${url.protocol}//${url.host}`;
  const webhookUrl = `${origin}/api/bot`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || undefined;

  // ثبت وب‌هوک
  const setRes = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      }),
    }
  ).then((r) => r.json());

  // وضعیت فعلی وب‌هوک برای بررسی
  const info = await fetch(
    `https://api.telegram.org/bot${token}/getWebhookInfo`
  ).then((r) => r.json());

  // اطلاعات ربات (برای اطمینان از درستی توکن)
  const me = await fetch(
    `https://api.telegram.org/bot${token}/getMe`
  ).then((r) => r.json());

  return Response.json({
    ok: setRes.ok === true,
    requested_webhook: webhookUrl,
    setWebhook: setRes,
    webhookInfo: info,
    bot: me.result
      ? { username: me.result.username, name: me.result.first_name }
      : me,
    hint: setRes.ok
      ? "وب‌هوک با موفقیت ثبت شد. حالا در تلگرام به ربات /start بزن."
      : "ثبت وب‌هوک ناموفق بود — به فیلد setWebhook نگاه کن.",
  });
}
