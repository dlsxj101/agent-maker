import type { NextConfig } from "next";

// GitHub Pages(프로젝트 페이지)는 `/<repo>` 하위 경로로 서빙되므로 CI 빌드에서만 basePath 를 준다.
// 로컬 개발(PAGES_BASE_PATH 미설정)에는 영향 없음(루트 서빙).
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  // 공공기관 폐쇄망 배포 시나리오: 앱이 완전 클라이언트 사이드(생성·ZIP 모두 브라우저)이므로
  // 정적 export 로 빌드한다 → `out/` 의 정적 파일만으로 어떤 웹서버에서도 서빙 가능. (PLAN.md §9, M6)
  output: "export",
  reactStrictMode: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true }, // 정적 export 에서 next/image 최적화 비활성
};

export default nextConfig;
