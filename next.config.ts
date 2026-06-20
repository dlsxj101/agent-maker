import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 공공기관 폐쇄망 배포 시나리오를 고려해, 추후 정적 export 옵션을 검토한다. (PLAN.md §9)
  // output: "export",
  reactStrictMode: true,
};

export default nextConfig;
