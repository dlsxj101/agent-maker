import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * ESLint flat config (ESLint 9 / Next 16).
 *
 * Next 16의 `eslint-config-next`는 네이티브 flat config 배열을 export 한다.
 * (구버전의 FlatCompat + `extends("next/...")` 방식은 ESLint 9에서 circular JSON 오류를 냈음 — PLAN §9)
 * 실행은 `next lint`(Next 16에서 제거됨) 대신 `eslint` 를 직접 쓴다. (package.json "lint")
 */
const eslintConfig = [
  {
    // 빌드 산출물·의존성은 검사 제외
    ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts"],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // `_` 접두사는 "의도적 미사용" 관례 — placeholder 파라미터 등에 허용
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
