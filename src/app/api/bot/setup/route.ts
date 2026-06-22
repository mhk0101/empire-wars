import { gameUrl } from "@/game/telegram";

export const dynamic = "force-dynamic";

// این مسیر را یک‌بار باز کن تا webhook ربات روی تلگرام ثبت شود:
//   https://دامنه-شما/api/bot/setup
export async function GET(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return Response.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN در .env تنظیم نشده است." },
      { status: 400 }
    );
  }

  const base = gameUrl();
  if (!base) {
    return Response.json(
      {
        ok: false,
        error:
          "NEXT_PUBLIC_APP_URL در .env تنظیم نشده است (آدرس کامل سایت با https).",
      },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  const webhookUrl = `${origin}/api/bot`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || undefined;

  const res = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ["message", "callback_query"],
      }),
    }
  );
  const data = await res.json();

  return Response.json({
    requested_webhook: webhookUrl,
    telegram_response: data,
  });
}
