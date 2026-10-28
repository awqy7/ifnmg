/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const apiOrigin = new URL(apiUrl).origin;
const websocketOrigin = apiOrigin.replace(/^http/, "ws");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Evita que o Turbopack suba até a raiz do monorepo por causa de lockfiles extras.
  turbopack: {
    root: __dirname,
  },

  // Rewrites para proxy das chamadas de API para o backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },

  // Headers de segurança
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"} https://vercel.live`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              `connect-src 'self' https://*.vercel.app https://*.supabase.co wss://*.supabase.co ${apiOrigin} ${websocketOrigin}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
