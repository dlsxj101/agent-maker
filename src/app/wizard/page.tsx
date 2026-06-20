import { WizardShell } from "@/components/wizard/WizardShell";

/**
 * 마법사 페이지. 셸/상태/내비게이션은 클라이언트 컴포넌트(WizardShell)에서 처리한다.
 * (산출물 미리보기/내보내기 화면은 M5 에서 추가)
 */
export default function WizardPage() {
  return <WizardShell />;
}
