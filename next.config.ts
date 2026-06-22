import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // اجازه دسترسی به منابع dev از روی IP شبکه (رفع هشدار cross-origin)
  allowedDevOrigins: ["51.83.254.200"],
};

export default nextConfig;
