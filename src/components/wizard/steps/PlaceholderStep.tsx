"use client";

/**
 * 아직 폼이 구현되지 않은 단계용 자리표시자. (M5 에서 전 스텝 폼 완성)
 * 셸/상태/네비게이션이 동작함을 보이기 위한 안내를 표시한다.
 */

export function PlaceholderStep({ title, summary }: { title: string; summary: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted">{summary}</p>
      <p className="mt-4 text-xs text-muted">
        이 단계의 선택 폼은 다음 마일스톤(M5)에서 추가됩니다. 현재 값은 안전한 기본값으로
        설정되어 있어 산출물 생성에는 지장이 없습니다.
      </p>
    </div>
  );
}
