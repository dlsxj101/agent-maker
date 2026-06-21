"use client";

import { useWizardStore } from "@/lib/store";
import { FRONTEND_FRAMEWORKS, EMBED_MODES, A11Y_LEVELS, DEPLOY_CHANNELS, USER_AUTH_MODES } from "@/lib/agent-spec";

// 이용자 본인확인/로그인 방식
const USER_AUTH_META: Record<(typeof USER_AUTH_MODES)[number], { label: string; description: string }> = {
  none: { label: "비로그인", description: "본인확인 없이 누구나 이용 (일반 안내형)" },
  "simple-auth": { label: "간편인증", description: "PASS·카카오 등 간편인증으로 본인확인" },
  "gov-pki": { label: "공동/금융인증서", description: "공동인증서(GPKI/NPKI) — 민감 민원 본인확인" },
  membership: { label: "회원 로그인", description: "자체 회원 계정 로그인" },
};
import { OptionCards, ToggleField, TextField, ChipMulti } from "../controls";

// 배포 채널 라벨 (아이콘 포함)
const CHANNEL_LABELS: Record<(typeof DEPLOY_CHANNELS)[number], string> = {
  web: "🌐 웹",
  "kakao-channel": "💬 카카오 채널",
  "kakao-alimtalk": "📨 카카오 알림톡",
  app: "📱 모바일 앱",
  slack: "🔷 Slack",
  teams: "🟦 Teams",
};

// 프레임워크별 한 줄 설명 (한국어)
const FRAMEWORK_DESC: Record<(typeof FRONTEND_FRAMEWORKS)[number], string> = {
  react: "⚛ React SPA — 컴포넌트 재사용성 최고, 생태계 풍부",
  nextjs: "⚛ Next.js — SSR/SSG 지원, SEO·공공 포털에 권장",
  vue: "🟩 Vue — 경량·직관적, 기존 HTML에 점진적으로 도입 가능",
  "vanilla-widget": "📄 순수 JS 위젯 — 프레임워크 없이 어느 페이지에나 삽입",
  "embed-snippet": "📦 임베드 스니펫 — 스크립트 한 줄로 기존 사이트에 붙이는 방식",
};

// 임베드 방식별 한 줄 설명
const EMBED_DESC: Record<(typeof EMBED_MODES)[number], string> = {
  "standalone-page": "💬 독립 페이지 — 챗봇 전용 URL로 제공, 가장 단순한 배포",
  "script-tag": "📦 스크립트 태그 — 외부 사이트에 <script> 한 줄 삽입",
  iframe: "🖼 iframe — 기존 페이지 안에 iframe으로 안전하게 삽입",
  "npm-package": "📦 npm 패키지 — 프론트엔드 프로젝트에 라이브러리로 import",
};

// 웹 접근성(KWCAG) 등급별 한 줄 설명
const A11Y_DESC: Record<(typeof A11Y_LEVELS)[number], string> = {
  none: "접근성 기준 미지정 — 공공기관 납품 시 권장하지 않음",
  "kwcag-a": "KWCAG 2.2 A 등급 — 최소 필수 기준 (텍스트 대안·키보드 등)",
  "kwcag-aa": "KWCAG 2.2 AA 등급 — 공공기관 법적 권고 기준 (대비·오류 등)",
  "kwcag-aaa": "KWCAG 2.2 AAA 등급 — 최상위 기준, 일부 항목 달성 어려울 수 있음",
};

export function FrontendStep() {
  const fe = useWizardStore((s) => s.spec.frontend);
  const update = useWizardStore((s) => s.updateSection);
  return (
    <div className="space-y-5">
      {/* 프레임워크 — 시각 카드 선택 */}
      <OptionCards
        label="프레임워크"
        value={fe.framework}
        onChange={(v) => update("frontend", { framework: v as (typeof FRONTEND_FRAMEWORKS)[number] })}
        options={FRONTEND_FRAMEWORKS.map((f) => ({
          id: f,
          label: f === "react" ? "React" : f === "nextjs" ? "Next.js" : f === "vue" ? "Vue" : f === "vanilla-widget" ? "순수 JS 위젯" : "임베드 스니펫",
          description: FRAMEWORK_DESC[f],
        }))}
        columns={2}
      />

      {/* 임베드 방식 — 시각 카드 선택 */}
      <OptionCards
        label="임베드 방식"
        value={fe.embed}
        onChange={(v) => update("frontend", { embed: v as (typeof EMBED_MODES)[number] })}
        options={EMBED_MODES.map((e) => ({
          id: e,
          label: e === "standalone-page" ? "독립 페이지" : e === "script-tag" ? "스크립트 삽입" : e === "iframe" ? "iframe" : "npm 패키지",
          description: EMBED_DESC[e],
        }))}
        columns={2}
      />

      {/* 웹 접근성(KWCAG) 등급 — 시각 카드 선택 */}
      <OptionCards
        label="웹 접근성(KWCAG)"
        value={fe.a11yLevel}
        onChange={(v) => update("frontend", { a11yLevel: v as (typeof A11Y_LEVELS)[number] })}
        options={A11Y_LEVELS.map((a) => ({
          id: a,
          label: a === "none" ? "미지정" : a === "kwcag-a" ? "A 등급" : a === "kwcag-aa" ? "AA 등급" : "AAA 등급",
          description: A11Y_DESC[a],
        }))}
        columns={2}
        hint="컴플라이언스 단계의 접근성 등급과 일치시키세요."
      />

      <TextField
        label="UI 라이브러리 (선택)"
        value={fe.uiLib ?? ""}
        onChange={(v) => update("frontend", { uiLib: v || undefined })}
        placeholder="예: shadcn, mui, none"
      />
      <ToggleField
        label="반응형/모바일 지원"
        checked={fe.responsive}
        onChange={(v) => update("frontend", { responsive: v })}
      />

      {/* 배포 채널 */}
      <ChipMulti
        label="배포 채널"
        value={fe.channels}
        onChange={(v) => update("frontend", { channels: v as typeof fe.channels })}
        options={DEPLOY_CHANNELS.map((c) => [c, CHANNEL_LABELS[c]])}
        hint="공공 민원은 카카오 채널/알림톡을 함께 쓰는 경우가 많습니다. (폐쇄망은 웹/앱 권장)"
      />
      {/* 이용자 본인확인 */}
      <OptionCards
        label="이용자 본인확인/로그인"
        columns={2}
        value={fe.userAuth}
        onChange={(v) => update("frontend", { userAuth: v as (typeof USER_AUTH_MODES)[number] })}
        options={USER_AUTH_MODES.map((m) => ({ id: m, label: USER_AUTH_META[m].label, description: USER_AUTH_META[m].description }))}
        hint="민감 민원(본인 정보 조회 등)은 본인확인이 필요합니다."
      />

      <div className="grid grid-cols-2 gap-3">
        <ToggleField
          label="UI 문구 다국어 현지화"
          checked={fe.localizeUi}
          onChange={(v) => update("frontend", { localizeUi: v })}
        />
        <ToggleField
          label="RTL(우→좌) 언어 지원"
          checked={fe.rtl}
          onChange={(v) => update("frontend", { rtl: v })}
        />
      </div>
    </div>
  );
}
