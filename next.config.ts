import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // frame-ancestors 제한을 두지 않아 노션 등 어떤 사이트에서도 임베드 가능.
  // 노션은 임베드를 Iframely 같은 중첩 iframe으로 감싸 렌더링하므로,
  // frame-ancestors로 도메인을 제한하면 조상 체인 불일치로 ERR_BLOCKED_BY_RESPONSE가 발생함.
  // X-Frame-Options도 설정하지 않으므로 임베드가 차단되지 않음.
};

export default nextConfig;
