/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // ❌ X-Frame-Options는 iframe 자체를 막아서 제거
          // { key: "X-Frame-Options", value: "DENY" },

          // ✅ Notion iframe 허용
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors https://www.notion.so https://notion.so;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
