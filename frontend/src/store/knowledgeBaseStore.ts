import { create } from "zustand";

export type KnowledgeRecord = {
  id: string;
  text: string;
  focus?: string;
  difficulty?: string;
  type?: string;
  answer?: string;
  tags?: string[];
  notes?: string;
};

type KnowledgeBaseState = {
  records: KnowledgeRecord[];
  setRecords: (records: KnowledgeRecord[]) => void;
};

export const useKnowledgeBaseStore = create<KnowledgeBaseState>((set) => ({
  records: [],
  setRecords: (records) => set({ records })
}));
