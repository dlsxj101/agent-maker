"use client";

/**
 * 현재 스텝 id 에 맞는 폼을 렌더한다. (전 스텝 폼 — M5)
 */

import { WIZARD_STEPS } from "@/catalog";
import { ProjectStep } from "./steps/ProjectStep";
import { DesignStep } from "./steps/DesignStep";
import { FrontendStep } from "./steps/FrontendStep";
import { BackendStep } from "./steps/BackendStep";
import { DatabaseStep } from "./steps/DatabaseStep";
import { RagStep } from "./steps/RagStep";
import { LlmStep } from "./steps/LlmStep";
import { ConversationStep } from "./steps/ConversationStep";
import { InteractionStep } from "./steps/InteractionStep";
import { AgentStep } from "./steps/AgentStep";
import { IntegrationsStep } from "./steps/IntegrationsStep";
import { EvaluationStep } from "./steps/EvaluationStep";
import { ComplianceStep } from "./steps/ComplianceStep";
import { OpsStep } from "./steps/OpsStep";

const REGISTRY: Record<string, React.ComponentType> = {
  project: ProjectStep,
  design: DesignStep,
  frontend: FrontendStep,
  backend: BackendStep,
  database: DatabaseStep,
  rag: RagStep,
  llm: LlmStep,
  conversation: ConversationStep,
  interaction: InteractionStep,
  agent: AgentStep,
  integrations: IntegrationsStep,
  evaluation: EvaluationStep,
  compliance: ComplianceStep,
  ops: OpsStep,
};

export function StepContent({ stepIndex }: { stepIndex: number }) {
  const step = WIZARD_STEPS[stepIndex];
  const Comp = REGISTRY[step.id];
  return Comp ? <Comp /> : null;
}
