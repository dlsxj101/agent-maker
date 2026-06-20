"use client";

/**
 * 현재 스텝 id 에 맞는 폼을 렌더한다. (슬라이스 3단계는 실제 폼, 나머지는 자리표시자)
 */

import { WIZARD_STEPS } from "@/catalog";
import { ProjectStep } from "./steps/ProjectStep";
import { DesignStep } from "./steps/DesignStep";
import { LlmStep } from "./steps/LlmStep";
import { PlaceholderStep } from "./steps/PlaceholderStep";

export function StepContent({ stepIndex }: { stepIndex: number }) {
  const step = WIZARD_STEPS[stepIndex];
  switch (step.id) {
    case "project":
      return <ProjectStep />;
    case "design":
      return <DesignStep />;
    case "llm":
      return <LlmStep />;
    default:
      return <PlaceholderStep title={step.title} summary={step.summary} />;
  }
}
