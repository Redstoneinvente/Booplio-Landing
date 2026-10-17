import { useEffect, useRef, useState, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db, errorMessage } from "./firebase";
import type { Dent } from "./types";
import { starters } from "./starters";
export function useCatalog(text: string, category: string) {
  const [remote, setRemote] = useState<Dent[]>([]),
    [loading, setLoading] = useState(false),
    [more, setMore] = useState(false),
    [error, setError] = useState("");
  const cursor = useRef<QueryDocumentSnapshot<DocumentData> | null>(null),
    generation = useRef(0),
    fetching = useRef(false);
  const [settled, setSettled] = useState(text);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(text), 250);
    return () => clearTimeout(timer);
  }, [text]);
  const normalized = settled.trim().toLowerCase().normalize("NFKC");
  const first =
    normalized
      .split(/[^\p{L}\p{N}_]+/u)
      .find((x) => x.length >= 2)
      ?.slice(0, 24) || "";
  const load = useCallback(
    async (reset = false) => {
      if (!db || (fetching.current && !reset)) return;
      const g = reset ? ++generation.current : generation.current;
      if (reset) {
        cursor.current = null;
        setRemote([]);
      }
      fetching.current = true;
      setLoading(true);
      setError("");
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "dents"),
            where("status", "==", "published"),
            ...(first ? [where("searchTokens", "array-contains", first)] : []),
            ...(category !== "all" ? [where("category", "==", category)] : []),
            orderBy("createdAt", "desc"),
            ...(!reset && cursor.current ? [startAfter(cursor.current)] : []),
            limit(36),
          ),
        );
        if (g !== generation.current) return;
        cursor.current = snapshot.docs.at(-1) || cursor.current;
        setRemote((old) => [
          ...new Map(
            [
              ...old,
              ...snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Dent),
            ].map((d) => [d.id, d]),
          ).values(),
        ]);
        setMore(snapshot.size === 36);
      } catch (e) {
        if (g === generation.current) setError(errorMessage(e));
      } finally {
        if (g === generation.current) {
          fetching.current = false;
          setLoading(false);
        }
      }
    },
    [first, category],
  );
  useEffect(() => {
    void load(true);
    return () => {
      generation.current++;
      fetching.current = false;
    };
  }, [load]);
  return {
    dents: [...starters, ...remote],
    loading,
    more,
    loadMore: () => load(),
    catalogError: error,
  };
}
