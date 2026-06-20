"use client";

import { useWizardStore } from "@/lib/store";
import {
  BACKEND_RUNTIMES,
  AUTH_MODES,
  DEPLOY_FORMS,
  NETWORK_MODES,
} from "@/lib/agent-spec";
import { FRAMEWORKS_BY_RUNTIME } from "@/catalog";
import { OptionCards, ToggleField, TextField } from "../controls";

/* -------------------------------------------------------------------------- */
/* 런타임 선택지 메타데이터 — 이모지 + 한국어 설명 포함                            */
/* -------------------------------------------------------------------------- */

const RUNTIME_OPTIONS = [
  { id: "node", label: "Node 🟢", description: "JavaScript/TypeScript 기반, npm 생태계 최대 활용" },
  { id: "python", label: "Python 🐍", description: "AI·데이터 라이브러리 친화적, FastAPI/Django 지원" },
  { id: "java", label: "Java ☕", description: "공공기관 표준 언어, Spring Boot 엔터프라이즈 검증" },
  { id: "go", label: "Go 🐹", description: "초고성능·저메모리, 폐쇄망 단일 바이너리 배포 적합" },
  { id: "none", label: "없음", description: "백엔드 없이 정적/프론트엔드 전용으로 구성" },
] as const satisfies readonly { id: (typeof BACKEND_RUNTIMES)[number]; label: string; description: string }[];

/* -------------------------------------------------------------------------- */
/* 인증 선택지 메타데이터                                                         */
/* -------------------------------------------------------------------------- */

const AUTH_OPTIONS = [
  { id: "none", label: "없음", description: "인증 없이 공개 접근 (내부 망 전용 서비스)" },
  { id: "session", label: "세션", description: "서버 세션 쿠키 방식, 전통적 공공 웹서비스 표준" },
  { id: "jwt", label: "JWT", description: "무상태 토큰 인증, API 서버·마이크로서비스에 적합" },
  { id: "sso-gpki", label: "SSO(GPKI)", description: "행정전자서명·공무원 통합인증, 공공기관 필수" },
  { id: "oauth", label: "OAuth", description: "외부 소셜/기관 OAuth 2.0 연동 인증" },
] as const satisfies readonly { id: (typeof AUTH_MODES)[number]; label: string; description: string }[];

/* -------------------------------------------------------------------------- */
/* 배포 형태 선택지 메타데이터                                                    */
/* -------------------------------------------------------------------------- */

const DEPLOY_OPTIONS = [
  { id: "docker", label: "Docker 컨테이너", description: "이미지 기반 일관된 배포, 대부분 환경 적합" },
  { id: "kubernetes", label: "Kubernetes", description: "오케스트레이션 클러스터, 고가용·대규모 운영" },
  { id: "single-server", label: "단일 서버", description: "VM/베어메탈 직접 실행, 소규모·폐쇄망 적합" },
  { id: "serverless", label: "서버리스", description: "이벤트 기반 함수 실행, 트래픽 급변 서비스" },
] as const satisfies readonly { id: (typeof DEPLOY_FORMS)[number]; label: string; description: string }[];

/* -------------------------------------------------------------------------- */
/* 네트워크 선택지 메타데이터 — 이모지 포함                                        */
/* -------------------------------------------------------------------------- */

const NETWORK_OPTIONS = [
  {
    id: "internet-allowed",
    label: "인터넷 🌐",
    description: "외부 인터넷 직접 통신 허용, 클라우드 API 연동 가능",
  },
  {
    id: "proxy-only",
    label: "프록시 🛡",
    description: "승인된 프록시 경유만 허용, 망분리 환경 표준",
  },
  {
    id: "offline",
    label: "폐쇄망 🔒",
    description: "완전 오프라인, 외부 API 차단 — 공공기관 폐쇄망(국정원 검토) 필수",
  },
] as const satisfies readonly { id: (typeof NETWORK_MODES)[number]; label: string; description: string }[];

/* -------------------------------------------------------------------------- */
/* BackendStep 컴포넌트                                                          */
/* -------------------------------------------------------------------------- */

export function BackendStep() {
  const be = useWizardStore((s) => s.spec.backend);
  const update = useWizardStore((s) => s.updateSection);

  // 선택된 런타임에 따른 프레임워크 목록 (런타임→프레임워크 의존 관계 유지)
  const frameworks = FRAMEWORKS_BY_RUNTIME[be.runtime];

  return (
    <div className="space-y-5">
      {/* 런타임 — 이모지 라벨 + 한국어 설명 카드 */}
      <OptionCards
        label="런타임"
        value={be.runtime}
        onChange={(v) => {
          const rt = v as (typeof BACKEND_RUNTIMES)[number];
          // 런타임 변경 시 프레임워크를 해당 런타임의 첫 번째로 초기화
          update("backend", { runtime: rt, framework: FRAMEWORKS_BY_RUNTIME[rt][0]?.id });
        }}
        options={RUNTIME_OPTIONS}
        columns={3}
      />

      {/* 프레임워크 — 선택된 런타임에 따라 동적 표시 (의존 관계 유지) */}
      {frameworks.length > 0 && (
        <OptionCards
          label="프레임워크"
          value={be.framework ?? frameworks[0].id}
          onChange={(v) => update("backend", { framework: v })}
          options={frameworks}
          columns={2}
        />
      )}

      {/* 인증/인가 */}
      <OptionCards
        label="인증/인가"
        value={be.auth}
        onChange={(v) => update("backend", { auth: v as (typeof AUTH_MODES)[number] })}
        options={AUTH_OPTIONS}
        columns={3}
      />

      {/* 배포 형태 */}
      <OptionCards
        label="배포 형태"
        value={be.deploy}
        onChange={(v) => update("backend", { deploy: v as (typeof DEPLOY_FORMS)[number] })}
        options={DEPLOY_OPTIONS}
        columns={2}
      />

      {/* 네트워크(외부 호출) — 이모지 라벨 + 설명 카드 */}
      <OptionCards
        label="네트워크(외부 호출)"
        value={be.network}
        onChange={(v) => update("backend", { network: v as (typeof NETWORK_MODES)[number] })}
        options={NETWORK_OPTIONS}
        columns={3}
      />

      {/* 감사 로그 — ToggleField 유지 */}
      <ToggleField
        label="감사 로그(공공기관 대응)"
        checked={be.logging.audit}
        onChange={(v) => update("backend", { logging: { ...be.logging, audit: v } })}
      />

      {/* 모니터링 텍스트 입력 — TextField 유지 */}
      <TextField
        label="모니터링 (선택)"
        value={be.logging.monitoring ?? ""}
        onChange={(v) =>
          update("backend", { logging: { ...be.logging, monitoring: v || undefined } })
        }
        placeholder="예: prometheus"
      />
    </div>
  );
}
