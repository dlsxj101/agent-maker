"use client";

import { useWizardStore } from "@/lib/store";
import {
  RDB_OPTIONS,
  HISTORY_OPTIONS,
  CACHE_OPTIONS,
  FILE_STORE_OPTIONS,
} from "@/lib/agent-spec";
import { label } from "@/generators/format";
import { SelectField } from "../controls";

const HISTORY_LABELS: Record<string, string> = {
  "same-as-rdb": "RDB와 동일",
  separate: "별도 저장소",
  none: "저장 안 함",
};

export function DatabaseStep() {
  const db = useWizardStore((s) => s.spec.database);
  const update = useWizardStore((s) => s.updateSection);
  return (
    <div className="space-y-5">
      <SelectField
        label="관계형 DB (국산 포함)"
        value={db.rdb}
        onChange={(v) => update("database", { rdb: v as (typeof RDB_OPTIONS)[number] })}
        options={RDB_OPTIONS.map((r) => [r, label("rdb", r)])}
      />
      <SelectField
        label="대화 이력 저장"
        value={db.history}
        onChange={(v) => update("database", { history: v as (typeof HISTORY_OPTIONS)[number] })}
        options={HISTORY_OPTIONS.map((h) => [h, HISTORY_LABELS[h] ?? h])}
      />
      <SelectField
        label="캐시"
        value={db.cache ?? "none"}
        onChange={(v) => update("database", { cache: v as (typeof CACHE_OPTIONS)[number] })}
        options={CACHE_OPTIONS.map((c) => [c, c === "none" ? "없음" : c])}
      />
      <SelectField
        label="파일/문서 저장소"
        value={db.fileStore}
        onChange={(v) => update("database", { fileStore: v as (typeof FILE_STORE_OPTIONS)[number] })}
        options={FILE_STORE_OPTIONS.map((f) => [f, label("fileStore", f)])}
      />
    </div>
  );
}
