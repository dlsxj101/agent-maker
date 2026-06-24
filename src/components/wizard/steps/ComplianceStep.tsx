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
      <Field label="개인정보 보호" info="챗봇이 개인정보를 다루는 방식. 공공기관 개인정보보호법·행안부 지침을 기준으로 설정한다.">
        <div className="space-y-3">
          <ToggleField
            label="개인정보 수집"
            checked={c.privacy.collectsPii}
            onChange={(v) => update("compliance", { privacy: { ...c.privacy, collectsPii: v } })}
            info="챗봇이 이름·연락처 등 개인정보를 수집하면 동의·보관·파기 절차가 요구된다."
          />
          <ToggleField
            label="마스킹/비식별"
            checked={c.privacy.masking}
            onChange={(v) => update("compliance", { privacy: { ...c.privacy, masking: v } })}
            info="로그·화면에 노출되는 개인정보를 자동으로 가려 식별 불가능하게 처리한다."
          />
          {c.privacy.collectsPii && (
            <StringListField
              label="수집 항목"
              value={c.privacy.piiItems ?? []}
              onChange={(v) => update("compliance", { privacy: { ...c.privacy, piiItems: v } })}
              placeholder="예: 이름, 연락처"
              info="수집하는 개인정보 항목 목록. 개인정보처리방침에 명시해야 하는 항목이다."
            />
          )}
          <NumberField
            label="보관 기간(일)"
            value={c.privacy.retentionDays}
            onChange={(v) => update("compliance", { privacy: { ...c.privacy, retentionDays: v } })}
            info="개인정보를 보관하는 최대 일수. 이후 자동 파기 절차가 필요하다."
          />
          <ToggleField
            label="개인정보 영향평가(PIA) 필요"
            checked={c.privacy.piaRequired}
            onChange={(v) => update("compliance", { privacy: { ...c.privacy, piaRequired: v } })}
            info="PIA(개인정보 영향평가)는 공공기관이 개인정보 처리 시스템 도입 전 거쳐야 하는 법적 절차다."
          />
        </div>
      </Field>

      <Field label="보안" info="데이터 암호화·망분리·접속 통제 등 공공기관 보안 요건을 설정한다.">
        <div className="space-y-2">
          <ToggleField
            label="데이터 국내 보관"
            checked={c.security.dataResidencyKR}
            onChange={(v) => update("compliance", { security: { ...c.security, dataResidencyKR: v } })}
            info="모든 데이터를 국내 서버에만 저장해 해외 반출을 차단한다."
          />
          <ToggleField
            label="망분리 준수"
            checked={c.security.networkSeparation}
            onChange={(v) => update("compliance", { security: { ...c.security, networkSeparation: v } })}
            info="업무망과 인터넷망을 물리적으로 분리하는 공공기관 필수 보안 요건이다."
          />
          <ToggleField
            label="국정원 보안성 검토 대응"
            checked={c.security.nisReview ?? false}
            onChange={(v) => update("compliance", { security: { ...c.security, nisReview: v } })}
            info="국가정보원 보안성 검토 절차에 필요한 설계 근거를 산출물에 포함한다."
          />
          <ToggleField
            label="저장 데이터 암호화 (at-rest)"
            checked={c.security.encryption.atRest}
            onChange={(v) =>
              update("compliance", { security: { ...c.security, encryption: { ...c.security.encryption, atRest: v } } })
            }
            info="디스크에 저장된 데이터를 암호화해 물리 탈취 시에도 내용을 보호한다."
          />
          <ToggleField
            label="전송 구간 암호화 (TLS/HTTPS)"
            checked={c.security.encryption.inTransit}
            onChange={(v) =>
              update("compliance", { security: { ...c.security, encryption: { ...c.security.encryption, inTransit: v } } })
            }
            info="네트워크를 통해 전송되는 데이터를 TLS로 암호화해 도청을 차단한다."
          />
          <ToggleField
            label="접속 IP 제한 (허용목록)"
            checked={c.security.ipAllowlist.enabled}
            onChange={(v) =>
              update("compliance", { security: { ...c.security, ipAllowlist: { ...c.security.ipAllowlist, enabled: v } } })
            }
            info="지정한 IP 대역에서만 접속을 허용해 내부망 외부 접근을 차단한다."
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
              info="접속을 허용할 IP 대역을 CIDR 형식으로 입력한다. 예: 10.0.0.0/8"
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
        info="KWCAG는 한국형 웹 접근성 지침. 공공기관은 최소 AA 등급 준수를 권고한다."
      />

      <Field label="조달 요건" info="공공 조달 시 요구되는 국산 우선·망분리 설치 패키지 등 납품 조건을 설정한다.">
        <div className="space-y-2">
          <ToggleField
            label="국산 우선"
            checked={c.procurement?.domesticPreferred ?? false}
            onChange={(v) =>
              update("compliance", {
                procurement: { domesticPreferred: v, offlineInstaller: c.procurement?.offlineInstaller ?? false },
              })
            }
            info="국산 소프트웨어·오픈소스를 우선 선택하도록 산출물 지시서에 반영한다."
          />
          <ToggleField
            label="망분리용 오프라인 설치 패키지"
            checked={c.procurement?.offlineInstaller ?? false}
            onChange={(v) =>
              update("compliance", {
                procurement: { domesticPreferred: c.procurement?.domesticPreferred ?? false, offlineInstaller: v },
              })
            }
            info="인터넷 없이 설치할 수 있는 패키지를 산출물에 포함한다. 폐쇄망 납품 필수."
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
        info="GS(소프트웨어 품질인증)·CC(보안인증) 등 납품에 필요한 인증을 선택한다."
      />
    </div>
  );
}
