import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { auth, db, call, errorMessage } from "./firebase";
import type { Dent, Profile, Saved } from "./types";
import { starters } from "./starters";
type State = {
  user: User | null;
  profile: Profile | null;
  admin: boolean;
  authLoading: boolean;
  dents: Dent[];
  saved: Saved[];
  following: string[];
  loading: boolean;
  catalogError: string;
  more: boolean;
  loadMore: () => Promise<void>;
  toggleSave: (dent: Dent, collection?: string) => Promise<void>;
  toast: (text: string) => void;
  notify: string;
  refreshProfile: () => Promise<void>;
  reduced: boolean;
  setReduced: (value: boolean) => void;
};
const Context = createContext<State>(null!);
export function Store({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [isAdmin, setAdmin] = useState(false),
    [authLoading, setAuthLoading] = useState(Boolean(auth));
  const [live, setLive] = useState<Dent[]>([]),
    [saved, setSaved] = useState<Saved[]>([]),
    [following, setFollowing] = useState<string[]>([]),
    [loading, setLoading] = useState(Boolean(db)),
    [more, setMore] = useState(Boolean(db)),
    [catalogError, setCatalogError] = useState("");
  const [notify, setNotify] = useState(""),
    [reduced, setReducedState] = useState(
      () =>
        localStorage.getItem("booplio-reduced") === "true" ||
        matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const cursor = useRef<QueryDocumentSnapshot<DocumentData> | null>(null),
    fetching = useRef(false);
  const toast = useCallback((text: string) => setNotify(text), []);
  useEffect(() => {
    if (!notify) return;
    const timer = setTimeout(() => setNotify(""), 6000);
    return () => clearTimeout(timer);
  }, [notify]);
  const refreshProfile = useCallback(async () => {
    if (db && auth?.currentUser) {
      const d = await getDoc(doc(db, "profiles", auth.currentUser.uid));
      setProfile(d.exists() ? (d.data() as Profile) : null);
    }
  }, []);
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setProfile(null);
      setAdmin(false);
      setAuthLoading(false);
      if (u) {
        try {
          await refreshProfile();
          setAdmin((await u.getIdTokenResult()).claims.admin === true);
        } catch (e) {
          toast(errorMessage(e));
        }
      }
    });
  }, [refreshProfile, toast]);
  useEffect(() => {
    if (!db || !user) {
      setSaved([]);
      setFollowing([]);
      return;
    }
    const off = onSnapshot(
      collection(db, "users", user.uid, "saves"),
      (s) => setSaved(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Saved)),
      (e) => toast(errorMessage(e)),
    );
    const follow = onSnapshot(
      collection(db, "users", user.uid, "following"),
      (s) => setFollowing(s.docs.map((d) => d.id)),
      (e) => toast(errorMessage(e)),
    );
    return () => {
      off();
      follow();
    };
  }, [user, toast]);
  const loadMore = useCallback(async () => {
    if (!db || fetching.current) return;
    fetching.current = true;
    setLoading(true);
    setCatalogError("");
    try {
      const q = query(
        collection(db, "dents"),
        where("status", "==", "published"),
        orderBy("createdAt", "desc"),
        ...(cursor.current ? [startAfter(cursor.current)] : []),
        limit(36),
      );
      const snapshot = await getDocs(q);
      cursor.current = snapshot.docs.at(-1) || cursor.current;
      setLive((old) => [
        ...new Map(
          [
            ...old,
            ...snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Dent),
          ].map((d) => [d.id, d]),
        ).values(),
      ]);
      setMore(snapshot.size === 36);
    } catch (e) {
      setCatalogError(errorMessage(e));
    } finally {
      setLoading(false);
      fetching.current = false;
    }
  }, []);
  useEffect(() => {
    void loadMore();
  }, [loadMore]);
  const toggleSave = async (dent: Dent, group = "Favorites") => {
    if (!user)
      throw new Error("Sign in to save dents and sync your collection.");
    await call("saveToCollection", {
      id: dent.id,
      saved: !saved.some((s) => s.id === dent.id),
      collection: group,
    });
  };
  const setReduced = (v: boolean) => {
    setReducedState(v);
    localStorage.setItem("booplio-reduced", String(v));
  };
  return (
    <Context.Provider
      value={{
        user,
        profile,
        admin: isAdmin,
        authLoading,
        dents: [...starters, ...live],
        saved,
        following,
        loading,
        catalogError,
        more,
        loadMore,
        toggleSave,
        toast,
        notify,
        refreshProfile,
        reduced,
        setReduced,
      }}
    >
      <div className={reduced ? "reduce-motion" : ""}>{children}</div>
    </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
