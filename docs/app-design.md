# agent-maker 앱 디자인 시스템

> 이 문서는 **agent-maker 웹앱(마법사) 자신의 룩앤필**을 정의한다.
> ⚠️ `src/generators/`가 만드는 산출물 `DESIGN.md`(생성될 챗봇용 토큰)와는 **별개**다. (CLAUDE.md §9)
> 구현은 `src/app/globals.css`(토큰) + 컴포넌트가 이 토큰을 사용한다.

## 방향

**절제된 개발자 도구형 (restrained developer-tool).** 이 제품은 "결정 → 기계가 읽는 정본(spec/코드)을
결정적으로 생성"한다. 그래서 정체성을 **딥 틸 액센트 + 모노스페이스 'spec' 모티프 + 헤어라인 + 컴팩트한
간격**에 둔다 — 설정/코드 생성 도구다운 정밀함. 흔한 SaaS 파랑·AI 보라 그라데이션·크림+세리프 템플릿을 피한다.

> 원칙: 과감함은 한 곳(틸 + mono)에만. 나머지는 조용하고 규율 있게. 장식은 주제에 봉사할 때만.

## 컬러 토큰 (`:root`, light / dark 자동)

| 토큰 | light | 용도 |
|---|---|---|
| `--ground` | `#FBFCFC` | 페이지 배경(차가운 near-white) |
| `--surface` | `#FFFFFF` | 카드/패널 |
| `--surface-2` | `#F2F6F5` | 코드/인셋 영역 |
| `--text` | `#14201E` | 본문 ink(틸 틴트, 순흑 아님) |
| `--muted` | `#5C6B68` | 보조 텍스트 |
| `--border` | `#E2E8E6` | 경계 |
| `--hairline` | `#EEF2F1` | 미세 구분선 |
| `--accent` | `#0E6B5C` | 딥 틸 — 주요 액션·활성·링크 |
| `--accent-strong` | `#0A5448` | hover/강조 |
| `--accent-weak` | `#E7F1EE` | 활성 배경 틴트 |
| `--warn` / `--danger` | `#9A6700` / `#B42318` | 충돌 경고 / 필수 누락 |

다크 모드는 `prefers-color-scheme` 로 동일 토큰을 재정의(near-black 틸-ink + 밝은 틸).

Tailwind v4 `@theme inline` 로 매핑 → `bg-surface`, `text-muted`, `border-border`, `bg-primary`(=accent),
`text-primary-foreground`, `border-hairline`, `bg-surface-2` 유틸리티로 사용.

## 타이포그래피

- **본문/제목**: `--font-sans` = Pretendard 우선 한글 친화 스택(웹폰트 네트워크 의존 없음 — 폐쇄망 친화).
  제목은 `letter-spacing: -0.014em`, weight 600–700, 컴팩트한 스케일.
- **유틸/데이터**: `--font-mono` — 식별자·파일경로·충돌코드(C1)·`agent-spec.json` peek·eyebrow 에 사용.
  `.mono` / `.eyebrow`(작은 mono 대문자 트래킹, 틸) 헬퍼.
- 기본 본문 14px / line-height 1.55 (컴팩트).

## 레이아웃 · 컴포넌트

- 전역 슬림 헤더(높이 48px, 헤어라인): 워드마크(틸 `›` 마크 + mono `configurator` eyebrow).
- 랜딩: thesis 히어로 + **mono spec-peek 카드**(에디터 톤, agent-spec.json → 출력 파일) + 12단계 시퀀스
  (mono 인덱스 `00`–`11`, 헤어라인 — 번호는 실제 순서를 의미).
- 마법사: 3단(좌 스텝퍼 / 중 폼 / 우 라이브 프리뷰). 스텝퍼는 활성 시 좌측 액센트 바 + 틴트 배경 + mono 인덱스,
  상태 점(danger=누락, warn=충돌).
- 검토: 파일 탭(에디터 톤, 활성=틸) + mono 미리보기 + export 차단 게이트.
- 반경: `--radius` 6px(컴팩트), 입력 4px. 모션: 최소(0.12s), `prefers-reduced-motion` 존중.

## 규칙

- 색은 직접 hex 가 아니라 **토큰/CSS 변수**로. (CLAUDE.md §5)
- 새 화면/컴포넌트는 위 토큰·헬퍼를 재사용해 통일감을 유지한다.
- 접근성: 시맨틱 HTML, 키보드 포커스 가시성(`:focus-visible` 틸 아웃라인), 대비 확보.
