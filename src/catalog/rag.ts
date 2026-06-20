/**
 * RAG 카탈로그 — 임베딩 모델 · Vector DB · 리랭커 (데이터). (PLAN.md §4 Step 5)
 * 새 모델/DB = 이 데이터에 항목 추가. id 는 AgentSpec.rag 의 string/enum 값과 일치.
 */

export interface EmbeddingModel {
  id: string;
  label: string;
  /** 클라우드 API 인지(폐쇄망 충돌 대상) */
  cloud: boolean;
  /** 국산/한국어 특화 */
  domestic?: boolean;
  /** 임베딩 차원(비교 표시용) */
  dim?: number;
  note?: string;
}

/** 청킹 전략별 한국어 설명 (OptionCards 카드 description 용) */
export const CHUNKING_STRATEGY_DESCRIPTIONS: Record<string, string> = {
  fixed: "글자 수 기준 고정 크기로 자름. 단순·빠름",
  paragraph: "문단(개행) 단위 분할. 의미 단위 유지",
  semantic: "문장 임베딩 유사도로 의미 경계 탐지. 정확하나 느림",
  page: "문서 페이지 단위 분할. 스캔 문서·PDF에 적합",
};

/** 검색 전략별 한국어 설명 (OptionCards 카드 description 용) */
export const RETRIEVAL_STRATEGY_DESCRIPTIONS: Record<string, string> = {
  vector: "임베딩 벡터 유사도 검색. 의미 기반 매칭",
  hybrid: "BM25(키워드)+벡터 혼합. 정확도·재현율 균형",
};

/** 리랭커별 한국어 설명 (OptionCards 카드 description 용) */
export const RERANKER_DESCRIPTIONS: Record<string, string> = {
  none: "리랭킹 없이 검색 결과 순위 그대로 사용",
  "bge-reranker": "교차 인코더 기반 재정렬로 정확도 향상. 온프레미스",
  "cohere-rerank": "Cohere API 기반 재정렬. 클라우드 의존",
};

export const EMBEDDING_MODELS: EmbeddingModel[] = [
  // 온프레미스/한국어 (폐쇄망 가능)
  { id: "bge-m3", label: "BGE-M3", cloud: false, dim: 1024, note: "다국어·한국어 우수, 폐쇄망 기본" },
  { id: "kure", label: "KURE (국산)", cloud: false, domestic: true, note: "한국어 특화" },
  { id: "ko-sroberta", label: "Ko-SRoBERTa (국산)", cloud: false, domestic: true },
  { id: "multilingual-e5", label: "multilingual-e5", cloud: false, dim: 1024 },
  // 클라우드 API
  { id: "openai-text-embedding-3-large", label: "OpenAI text-embedding-3-large", cloud: true, dim: 3072 },
  { id: "openai-text-embedding-3-small", label: "OpenAI text-embedding-3-small", cloud: true, dim: 1536 },
  { id: "cohere-embed-v3", label: "Cohere embed v3", cloud: true },
  { id: "voyage-3", label: "Voyage-3", cloud: true },
];

export interface VectorDbInfo {
  id: string;
  label: string;
  /** 폐쇄망/온프레미스 설치 친화 */
  onPremFriendly: boolean;
  note?: string;
}

export const VECTOR_DB_CATALOG: VectorDbInfo[] = [
  { id: "pgvector", label: "pgvector", onPremFriendly: true, note: "PostgreSQL 확장 — 운영 단순" },
  { id: "qdrant", label: "Qdrant", onPremFriendly: true, note: "오픈소스, 자체 호스팅 용이" },
  { id: "milvus", label: "Milvus", onPremFriendly: true, note: "대규모" },
  { id: "weaviate", label: "Weaviate", onPremFriendly: true },
  { id: "chroma", label: "Chroma", onPremFriendly: true, note: "경량/로컬" },
  { id: "faiss", label: "FAISS (로컬)", onPremFriendly: true, note: "라이브러리, 완전 오프라인" },
];

export interface Reranker {
  id: string;
  label: string;
  /** 카드 설명 (OptionCards 용) */
  description?: string;
}

export const RERANKERS: Reranker[] = [
  { id: "none", label: "사용 안 함", description: "리랭킹 없이 검색 결과 순위 그대로 사용" },
  { id: "bge-reranker", label: "BGE-reranker (온프레미스)", description: "교차 인코더 기반 재정렬로 정확도 향상. 온프레미스" },
  { id: "cohere-rerank", label: "Cohere Rerank (클라우드)", description: "Cohere API 기반 재정렬. 클라우드 의존" },
];

/** 폐쇄망 충돌 판정용 — 클라우드 임베딩 id 집합 */
export const CLOUD_EMBEDDING_IDS = EMBEDDING_MODELS.filter((m) => m.cloud).map((m) => m.id);
