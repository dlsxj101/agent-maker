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
}

export const RERANKERS: Reranker[] = [
  { id: "none", label: "사용 안 함" },
  { id: "bge-reranker", label: "BGE-reranker (온프레미스)" },
  { id: "cohere-rerank", label: "Cohere Rerank (클라우드)" },
];

/** 폐쇄망 충돌 판정용 — 클라우드 임베딩 id 집합 */
export const CLOUD_EMBEDDING_IDS = EMBEDDING_MODELS.filter((m) => m.cloud).map((m) => m.id);
