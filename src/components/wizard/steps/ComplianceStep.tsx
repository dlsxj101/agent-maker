"use client";

import { useWizardStore } from "@/lib/store";
import { COMPLIANCE_A11Y, CERTIFICATIONS } from "@/lib/agent-spec";
import { label } from "@/generators/format";
import { OptionCards, ToggleField, NumberField, StringListField, ChipMulti, Field } from "../controls";

const A11Y_DESC: Record<string, string> = {
  none: "접근성 목표 미설정 (권장하지 않음)",
  "kwcag-a": "최소 수준 — 필수 항목만 충족",
  "kwcag-aa": "공공기관 표준 권고 수준 (기본)",
  "kwcag-aaa": "최고 수준 — 강화된 대비·보조기술 지원",
};

export function ComplianceStep() {
  const c = useWizardStore((s) => s.spec.compliance);
  const update = useWizardStore((s) => s.updateSection);

  return (
    <div className="space-y-6">
      <Field label="개인정보 보호">
        <div className="space-y-3">
          <ToggleField
            label="개인정보 수집"
            checked={c.privacy.collectsPii}
            onChange={(v) => update("compliance", { privacy: { ...c.privacy, collectsPii: v } })}
          />
          <ToggleField
            label="마스킹/비식별"
            checked={c.privacy.masking}
            onChange={(v) => update("compliance", { privacy: { ...c.privacy, masking: v } })}
          />
          {c.privacy.collectsPii && (
            <StringListField
              label="수집 항목"
              value={c.privacy.piiItems ?? []}
              onChange={(v) => update("compliance", { privacy: { ...c.privacy, piiItems: v } })}
              placeholder="예: 이름, 연락처"
            />
          )}
          <NumberField
            label="보관 기간(일)"
            value={c.privacy.retentionDays}
            onChange={(v) => update("compliance", { privacy: { ...c.privacy, retentionDays: v } })}
          />
          <ToggleField
            label="개인정보 영향평가(PIA) 필요"
            checked={c.privacy.piaRequired}
            onChange={(v) => update("compliance", { privacy: { ...c.privacy, piaRequired: v } })}
          />
        </div>
      </Field>

      <Field label="보안">
        <div className="space-y-2">
          <ToggleField
            label="데이터 국내 보관"
            checked={c.security.dataResidencyKR}
            onChange={(v) => update("compliance", { security: { ...c.security, dataResidencyKR: v } })}
          />
          <ToggleField
            label="망분리 준수"
            checked={c.security.networkSeparation}
            onChange={(v) => update("compliance", { security: { ...c.security, networkSeparation: v } })}
          />
          <ToggleField
            label="국정원 보안성 검토 대응"
            checked={c.security.nisReview ?? false}
            onChange={(v) => update("compliance", { security: { ...c.security, nisReview: v } })}
          />
          <ToggleField
            label="저장 데이터 암호화 (at-rest)"
            checked={c.security.encryption.atRest}
            onChange={(v) =>
              update("compliance", { security: { ...c.security, encryption: { ...c.security.encryption, atRest: v } } })
            }
          />
          <ToggleField
            label="전송 구간 암호화 (TLS/HTTPS)"
            checked={c.security.encryption.inTransit}
            onChange={(v) =>
              update("compliance", { security: { ...c.security, encryption: { ...c.security.encryption, inTransit: v } } })
            }
          />
          <ToggleField
            label="접속 IP 제한 (허용목록)"
            checked={c.security.ipAllowlist.enabled}
            onChange={(v) =>
              update("compliance", { security: { ...c.security, ipAllowlist: { ...c.security.ipAllowlist, enabled: v } } })
            }
          />
          {c.security.ipAllowlist.enabled && (
            <StringListField
              label="허용 IP 대역 (CIDR)"
              value={c.security.ipAllowlist.cidrs ?? []}
              onChange={(v) =>
                update("compliance", {
                  security: { ...c.security, ipAllowlist: { ...c.security.ipAllowlist, cidrs: v.length ? v : undefined } },
                })
              }
              placeholder="예: 10.0.0.0/8, 192.168.0.0/16"
            />
          )}
        </div>
      </Field>

      <OptionCards
        label="접근성 (KWCAG)"
        columns={4}
        value={c.a11y}
        onChange={(v) => update("compliance", { a11y: v as (typeof COMPLIANCE_A11Y)[number] })}
        options={COMPLIANCE_A11Y.map((a) => ({
          id: a,
          label: label("a11yLevel", a),
          description: A11Y_DESC[a],
        }))}
        hint="프론트엔드 접근성 등급과 일치시키세요."
      />

      <Field label="조달 요건">
        <div className="space-y-2">
          <ToggleField
            label="국산 우선"
            checked={c.procurement?.domesticPreferred ?? false}
            onChange={(v) =>
              update("compliance", {
                procurement: { domesticPreferred: v, offlineInstaller: c.procurement?.offlineInstaller ?? false },
              })
            }
          />
          <ToggleField
            label="망분리용 오프라인 설치 패키지"
            checked={c.procurement?.offlineInstaller ?? false}
            onChange={(v) =>
              update("compliance", {
                procurement: { domesticPreferred: c.procurement?.domesticPreferred ?? false, offlineInstaller: v },
              })
            }
          />
        </div>
      </Field>

      <ChipMulti
        label="인증"
        value={c.licensing?.certifications ?? []}
        onChange={(v) =>
          update("compliance", {
            licensing: { ossLicenseCheck: c.licensing?.ossLicenseCheck ?? true, certifications: v as ("gs" | "cc" | "none")[] },
          })
        }
        options={CERTIFICATIONS.map((cert) => [cert, cert === "none" ? "없음" : cert.toUpperCase()])}
      />
    </div>
  );
}
