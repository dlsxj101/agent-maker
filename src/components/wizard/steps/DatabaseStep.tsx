"use client";

import { useWizardStore } from "@/lib/store";
import {
  RDB_OPTIONS,
  HISTORY_OPTIONS,
  CACHE_OPTIONS,
  FILE_STORE_OPTIONS,
} from "@/lib/agent-spec";
import { OptionCards } from "../controls";

/* -------------------------------------------------------------------------- */
/* 선택지 설명 맵 — 각 카드에 표시할 한 줄 한국어 설명                            */
/* -------------------------------------------------------------------------- */

/** 관계형 DB 설명 */
const RDB_DESCRIPTIONS: Record<(typeof RDB_OPTIONS)[number], string> = {
  postgres: "오픈소스 표준 RDBMS. pgvector 기반 RAG에 최적",
  mysql: "국내 공공 환경에서 폭넓게 사용되는 오픈소스 DB",
  mariadb: "MySQL 호환 오픈소스; 완전 무상 라이선스",
  oracle: "대형 공공기관 표준 상용 DB; 대용량 안정성",
  tibero: "국산 상용 RDBMS; 행정망·폐쇄망 납품 적합 (국산)",
  none: "별도 관계형 DB 없이 운영",
};

/** 대화 이력 저장 설명 */
const HISTORY_DESCRIPTIONS: Record<(typeof HISTORY_OPTIONS)[number], string> = {
  "same-as-rdb": "선택한 RDB 테이블에 이력을 함께 저장",
  separate: "이력 전용 별도 저장소를 사용",
  none: "대화 이력을 영구 저장하지 않음",
};

/** 캐시 설명 */
const CACHE_DESCRIPTIONS: Record<(typeof CACHE_OPTIONS)[number], string> = {
  redis: "인메모리 캐시로 응답 속도·임베딩 재사용 최적화",
  none: "캐시 레이어 없이 운영 (소규모·단순 구성)",
};

/** 파일/문서 저장소 설명 */
const FILE_STORE_DESCRIPTIONS: Record<(typeof FILE_STORE_OPTIONS)[number], string> = {
  local: "서버 로컬 파일시스템 저장; 폐쇄망·단일 서버에 적합",
  "s3-compatible": "MinIO 등 S3 호환 오브젝트 스토리지",
  "gov-storage": "NIA 공공 클라우드(G-Cloud) 스토리지",
  none: "파일 저장소 없이 운영",
};

/* -------------------------------------------------------------------------- */
/* 라벨 맵 (이모지 포함)                                                        */
/* -------------------------------------------------------------------------- */

/** RDB 라벨 (이모지 + 이름) */
const RDB_LABELS: Record<(typeof RDB_OPTIONS)[number], string> = {
  postgres: "🐘 PostgreSQL",
  mysql: "🐬 MySQL",
  mariadb: "🦭 MariaDB",
  oracle: "🏢 Oracle",
  tibero: "🇰🇷 Tibero (국산)",
  none: "⊘ 없음",
};

/** 대화 이력 라벨 */
const HISTORY_LABELS_DISPLAY: Record<(typeof HISTORY_OPTIONS)[number], string> = {
  "same-as-rdb": "🗄 RDB와 동일",
  separate: "📁 별도 저장소",
  none: "⊘ 저장 안 함",
};

/** 캐시 라벨 */
const CACHE_LABELS: Record<(typeof CACHE_OPTIONS)[number], string> = {
  redis: "⚡ Redis",
  none: "⊘ 없음",
};

/** 파일/문서 저장소 라벨 */
const FILE_STORE_LABELS: Record<(typeof FILE_STORE_OPTIONS)[number], string> = {
  local: "💾 로컬 파일시스템",
  "s3-compatible": "☁ S3 호환",
  "gov-storage": "🏛 공공 클라우드 스토리지",
  none: "⊘ 없음",
};

/* -------------------------------------------------------------------------- */
/* 컴포넌트                                                                    */
/* -------------------------------------------------------------------------- */

export function DatabaseStep() {
  const db = useWizardStore((s) => s.spec.database);
  const update = useWizardStore((s) => s.updateSection);

  return (
    <div className="space-y-6">
      {/* 관계형 DB */}
      <OptionCards<(typeof RDB_OPTIONS)[number]>
        label="🗄 관계형 DB (국산 포함)"
        info="구조화된 데이터(사용자·설정·이력 등)를 저장하는 DB. Tibero는 국산 조달 대응에 유리하다."
        value={db.rdb}
        onChange={(v) => update("database", { rdb: v })}
        options={RDB_OPTIONS.map((r) => ({
          id: r,
          label: RDB_LABELS[r],
          description: RDB_DESCRIPTIONS[r],
        }))}
        columns={3}
      />

      {/* 대화 이력 저장 */}
      <OptionCards<(typeof HISTORY_OPTIONS)[number]>
        label="💬 대화 이력 저장"
        info="챗봇과의 대화 내용을 영구 보관하는 방식. 이력을 저장하면 맥락 유지·감사 추적이 가능하다."
        value={db.history}
        onChange={(v) => update("database", { history: v })}
        options={HISTORY_OPTIONS.map((h) => ({
          id: h,
          label: HISTORY_LABELS_DISPLAY[h],
          description: HISTORY_DESCRIPTIONS[h],
        }))}
        columns={3}
      />

      {/* 캐시 — cache 필드는 optional(undefined 가능)이므로 ?? "none" 으로 기본값 처리 */}
      <OptionCards<(typeof CACHE_OPTIONS)[number]>
        label="⚡ 캐시"
        info="자주 쓰는 데이터를 메모리에 올려 응답 속도를 높인다. Redis는 임베딩 결과 재사용에도 활용된다."
        value={db.cache ?? "none"}
        onChange={(v) => update("database", { cache: v })}
        options={CACHE_OPTIONS.map((c) => ({
          id: c,
          label: CACHE_LABELS[c],
          description: CACHE_DESCRIPTIONS[c],
        }))}
        columns={2}
      />

      {/* 파일/문서 저장소 */}
      <OptionCards<(typeof FILE_STORE_OPTIONS)[number]>
        label="📂 파일/문서 저장소"
        info="RAG용 문서·첨부 파일을 보관하는 저장소. 폐쇄망이면 로컬·온프레미스 스토리지를 선택해야 한다."
        value={db.fileStore}
        onChange={(v) => update("database", { fileStore: v })}
        options={FILE_STORE_OPTIONS.map((f) => ({
          id: f,
          label: FILE_STORE_LABELS[f],
          description: FILE_STORE_DESCRIPTIONS[f],
        }))}
        columns={2}
      />
    </div>
  );
}
