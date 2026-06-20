"use client";

/**
 * 마법사 폼 공용 컨트롤 — 스텝 폼들이 재사용한다. 토큰 기반 스타일 + 접근성 기본.
 */

import type { ReactNode } from "react";

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

type Opt = readonly [string, string];

export function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <Field label={props.label} required={props.required} hint={props.hint}>
      <input
        className="input"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </Field>
  );
}

export function NumberField(props: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  hint?: string;
}) {
  return (
    <Field label={props.label} hint={props.hint}>
      <input
        type="number"
        className="input"
        value={props.value ?? ""}
        onChange={(e) => props.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    </Field>
  );
}

export function SelectField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly Opt[];
  hint?: string;
}) {
  return (
    <Field label={props.label} hint={props.hint}>
      <select className="input" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ToggleField(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      {props.label}
    </label>
  );
}

/** 다중 선택 칩 (enum 배열용) */
export function ChipMulti(props: {
  label: string;
  value: readonly string[];
  options: readonly Opt[];
  onChange: (v: string[]) => void;
  hint?: string;
}) {
  const toggle = (v: string) =>
    props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
  return (
    <Field label={props.label} hint={props.hint}>
      <div className="flex flex-wrap gap-2">
        {props.options.map(([v, t]) => {
          const active = props.value.includes(v);
          return (
            <button
              key={v}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(v)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted hover:border-primary"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/**
 * 시각 선택 카드 (단일 선택) — "동등한 선택지를 보고 고른다" 원칙용.
 * 각 옵션은 라벨/설명 + 선택적 미리보기(렌더)를 가진다. (CLAUDE.md §4.3)
 */
export function OptionCards<T extends string>(props: {
  label?: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly { id: T; label: string; description?: string; preview?: ReactNode }[];
  columns?: number;
  hint?: string;
}) {
  const cols = props.columns ?? 2;
  const grid = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[cols] ?? "sm:grid-cols-2";
  const inner = (
    <div className={`grid grid-cols-1 gap-2 ${grid}`}>
      {props.options.map((o) => {
        const active = props.value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => props.onChange(o.id)}
            className={`flex flex-col rounded-lg border p-2.5 text-left transition ${
              active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary"
            }`}
          >
            {o.preview && (
              <span className="mb-1.5 flex min-h-[2rem] items-center rounded-md bg-surface-2 px-2 py-1.5">
                {o.preview}
              </span>
            )}
            <span className="text-sm font-medium">{o.label}</span>
            {o.description && <span className="mt-0.5 text-[11px] text-muted">{o.description}</span>}
          </button>
        );
      })}
    </div>
  );
  return props.label ? (
    <Field label={props.label} hint={props.hint}>
      {inner}
    </Field>
  ) : (
    inner
  );
}

/** 문자열 목록 편집기 (예: quickReplies) */
export function StringListField(props: {
  label: string;
  value: readonly string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  hint?: string;
}) {
  const items = props.value;
  return (
    <Field label={props.label} hint={props.hint}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input"
              value={item}
              placeholder={props.placeholder}
              onChange={(e) => props.onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <button
              type="button"
              aria-label="삭제"
              className="shrink-0 rounded-md border border-border px-3 text-sm text-muted"
              onClick={() => props.onChange(items.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted"
          onClick={() => props.onChange([...items, ""])}
        >
          + 추가
        </button>
      </div>
    </Field>
  );
}
