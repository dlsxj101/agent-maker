import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 공공기관 폐쇄망 배포 시나리오: 앱이 완전 클라이언트 사이드(생성·ZIP 모두 브라우저)이므로
  // 정적 export 로 빌드한다 → `out/` 의 정적 파일만으로 어떤 웹서버에서도 서빙 가능. (PLAN.md §9, M6)
  output: "export",
  reactStrictMode: true,
};

export default nextConfig;
