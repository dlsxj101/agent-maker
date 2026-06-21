/**
 * 음성 엔진 카탈로그 (데이터). (PLAN.md §4 Step 8 음성, M7-B)
 *
 * 음성 STT/TTS 엔진의 라벨·설명·배포 위치(폐쇄망 적합성)를 **데이터**로 둔다.
 * id 는 AgentSpec.interaction.voice 의 enum(VOICE_STT_ENGINES / VOICE_TTS_ENGINES)과 일치한다.
 *
 * 새 음성 엔진 추가 = 이 파일에 항목 추가 (UI·충돌검증·산출물이 자동 반영).
 */

import type { VOICE_STT_ENGINES, VOICE_TTS_ENGINES } from "@/lib/agent-spec";

type SttId = (typeof VOICE_STT_ENGINES)[number];
type TtsId = (typeof VOICE_TTS_ENGINES)[number];

/** 엔진 배포 위치 — 폐쇄망 적합성 판단의 근거 */
export type VoiceDeployment = "none" | "browser" | "on-prem" | "cloud";

export interface VoiceEngineOption<Id extends string> {
  id: Id;
  /** 사람이 읽는 라벨 */
  label: string;
  /** 한 줄 설명 */
  description: string;
  /** 배포 위치 */
  deployment: VoiceDeployment;
}

/** 폐쇄망(오프라인)에 적합한 배포 위치인지 — cloud 만 외부망이 필요하다. */
export function isAirgapSuitable(deployment: VoiceDeployment): boolean {
  return deployment !== "cloud";
}

/** STT(음성 인식) 엔진 카탈로그 */
export const VOICE_STT_CATALOG: VoiceEngineOption<SttId>[] = [
  { id: "none", label: "사용 안 함", description: "음성 인식 미사용", deployment: "none" },
  {
    id: "browser",
    label: "브라우저 내장",
    description: "Web Speech API — 추가 설치 없이 클라이언트에서 인식",
    deployment: "browser",
  },
  {
    id: "whisper-local",
    label: "Whisper (온프레미스)",
    description: "OpenAI Whisper 오픈소스 모델을 사내 추론 서버로 구동 (폐쇄망 적합)",
    deployment: "on-prem",
  },
  {
    id: "clova",
    label: "네이버 클로바 (클라우드)",
    description: "Naver CLOVA Speech — 한국어 인식 품질 우수, 외부 API 호출 필요",
    deployment: "cloud",
  },
  {
    id: "google",
    label: "Google (클라우드)",
    description: "Google Cloud Speech-to-Text — 다국어, 외부 API 호출 필요",
    deployment: "cloud",
  },
];

/** TTS(음성 합성) 엔진 카탈로그 */
export const VOICE_TTS_CATALOG: VoiceEngineOption<TtsId>[] = [
  { id: "none", label: "사용 안 함", description: "음성 출력 미사용", deployment: "none" },
  {
    id: "browser",
    label: "브라우저 내장",
    description: "Web Speech Synthesis API — 추가 설치 없이 클라이언트에서 합성",
    deployment: "browser",
  },
  {
    id: "coqui-local",
    label: "Coqui TTS (온프레미스)",
    description: "Coqui 오픈소스 TTS를 사내 추론 서버로 구동 (폐쇄망 적합)",
    deployment: "on-prem",
  },
  {
    id: "clova",
    label: "네이버 클로바 (클라우드)",
    description: "Naver CLOVA Voice — 자연스러운 한국어 음성, 외부 API 호출 필요",
    deployment: "cloud",
  },
  {
    id: "google",
    label: "Google (클라우드)",
    description: "Google Cloud Text-to-Speech — 다국어, 외부 API 호출 필요",
    deployment: "cloud",
  },
];

/** 외부망이 필요한(클라우드) 음성 엔진 id 집합 — 충돌검증(C16)에서 참조 */
export const CLOUD_VOICE_ENGINES: string[] = Array.from(
  new Set(
    [...VOICE_STT_CATALOG, ...VOICE_TTS_CATALOG]
      .filter((e) => e.deployment === "cloud")
      .map((e) => e.id),
  ),
);

/** id → 라벨 (산출물 문서/format 에서 사용). 미상이면 원문 반환. */
export function voiceLabel(id: string): string {
  const found = [...VOICE_STT_CATALOG, ...VOICE_TTS_CATALOG].find((e) => e.id === id);
  return found?.label ?? id;
}
