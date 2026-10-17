import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ArrowUpRight, Plus, Bell, Heart, Download } from "lucide-react";
import { useStore } from "../store";
import { db, call } from "../firebase";
import { type Dent, type Profile } from "../types";
import { PageHeading, Empty, DentCard, BusyButton } from "../components/UI";
export function SavedPage() {
  const { user, dents, saved, toast } = useStore();
  const [tab, setTab] = useState("saved"),
    [group, setGroup] = useState("All"),
    [extra, setExtra] = useState<Dent[]>([]);
  const downloads = JSON.parse(
    localStorage.getItem("booplio-downloads") || "{}",
  ) as Record<string, string>;
  useEffect(() => {
    if (!db || !user) return;
    const ids = [
      ...new Set([...saved.map((s) => s.id), ...Object.keys(downloads)]),
    ];
    const missing = ids
      .filter((id) => !dents.some((d) => d.id === id))
      .map((id) => ({ id }));
    void Promise.all(
      missing.map((s) =>
        getDoc(doc(db!, "dents", s.id))
          .then((d) =>
            d.exists() ? ({ id: d.id, ...d.data() } as Dent) : null,
          )
          .catch(() => null),
      ),
    ).then((ds) => setExtra(ds.filter(Boolean) as Dent[]));
  }, [saved, dents.length, user]);
  const all = [...dents, ...extra];
  const groups = ["All", ...new Set(saved.map((s) => s.collection))];
  const results = all.filter((d) =>
    tab === "downloaded"
      ? downloads[d.id]
      : saved.some(
          (s) => s.id === d.id && (group === "All" || s.collection === group),
        ),
  );
  return (
    <div className="content-wrap">
      <PageHeading
        eyebrow="KEEP THE GOOD LITTLE THINGS"
        title="Your little collection."
        description="Favorites to come back to. Dents to make your day."
      />
      <div className="tabs">
        <button
          className={tab === "saved" ? "active" : ""}
          onClick={() => setTab("saved")}
        >
          <Heart size={17} />
          Saved
        </button>
        <button
          className={tab === "downloaded" ? "active" : ""}
          onClick={() => setTab("downloaded")}
        >
          <Download size={17} />
          Downloaded on this browser
        </button>
      </div>
      {tab === "saved" && !user ? (
        <Empty
          title="A home for your favorites."
          action={
            <Link className="button" to="/account">
              Sign in to save dents
            </Link>
          }
        >
          Save a little joy and find it on any device.
        </Empty>
      ) : (
        <>
          {tab === "saved" && (
            <div className="chips spaced">
              {groups.map((g) => (
                <button
                  className={g === group ? "selected" : ""}
                  key={g}
                  onClick={() => setGroup(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
          {results.length ? (
            <div className="dent-grid">
              {results.map((d) => (
                <div key={d.id}>
                  <DentCard dent={d} />
                  {tab === "saved" && (
                    <label className="collection-select">
                      Collection
                      <select
                        value={
                          saved.find((s) => s.id === d.id)?.collection ||
                          "Favorites"
                        }
                        onChange={(e) => {
                          if (e.target.value === "new") {
                            const name = prompt(
                              "Name your collection (up to 40 characters)",
                            );
                            if (name?.trim())
                              void call("saveToCollection", {
                                id: d.id,
                                saved: true,
                                collection: name.trim().slice(0, 40),
                              }).catch((e) => toast(e.message));
                          } else
                            void call("saveToCollection", {
                              id: d.id,
                              saved: true,
                              collection: e.target.value,
                            }).catch((e) => toast(e.message));
                        }}
                      >
                        {groups
                          .filter((x) => x !== "All")
                          .map((g) => (
                            <option key={g}>{g}</option>
                          ))}
                        <option value="new">+ New collection</option>
                      </select>
                    </label>
                  )}
                  {downloads[d.id] && downloads[d.id] !== d.version && (
                    <Link to={`/dent/${d.id}`} className="pill green">
                      Update available
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title={
                tab === "saved"
                  ? "Your collection starts here."
                  : "Your first little download awaits."
              }
              action={
                <Link className="button lime" to="/search">
                  Explore dents <ArrowUpRight size={17} />
                </Link>
              }
            >
              Find something that feels like you.
            </Empty>
          )}
        </>
      )}
    </div>
  );
}
export function Creator() {
  const { id } = useParams();
  const { dents, user, following } = useStore();
  const [profile, setProfile] = useState<Profile | null>(
      id === "booplio"
        ? {
            uid: "booplio",
            handle: "booplio",
            displayName: "Booplio",
            bio: "Little things for your screen. Original starter dents, made for everyone.",
          }
        : null,
    ),
    [items, setItems] = useState<Dent[]>([]),
    [busy, setBusy] = useState(true),
    [err, setErr] = useState("");
  useEffect(() => {
    setBusy(true);
    setErr("");
    if (id === "booplio") {
      setProfile({
        uid: "booplio",
        handle: "booplio",
        displayName: "Booplio",
        bio: "Little things for your screen. Original starter dents, made for everyone.",
      });
      setItems(dents.filter((d) => d.builtin));
      setBusy(false);
      return;
    }
    if (!db || !id) {
      setBusy(false);
      return;
    }
    let active = true;
    void Promise.all([
      getDoc(doc(db, "profiles", id)),
      getDocs(
        query(
          collection(db, "dents"),
          where("status", "==", "published"),
          where("ownerId", "==", id),
        ),
      ),
    ])
      .then(([p, ds]) => {
        if (!active) return;
        setProfile(p.exists() ? (p.data() as Profile) : null);
        setItems(ds.docs.map((d) => ({ id: d.id, ...d.data() }) as Dent));
        setBusy(false);
      })
      .catch((e) => {
        setErr(e.message);
        setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [id]);
  if (busy)
    return (
      <div className="content-wrap">
        <p className="loading-line">Finding this little corner…</p>
      </div>
    );
  if (!profile)
    return (
      <div className="content-wrap">
        <Empty title="Creator not found.">
          {err || "This profile is not available."}
        </Empty>
      </div>
    );
  return (
    <div className="content-wrap">
      <div className="creator-profile">
        <div className="avatar giant">{profile.displayName[0]}</div>
        <span className="eyebrow">A LITTLE CORNER OF BOOPLIO</span>
        <h1>{profile.displayName}</h1>
        <span className="muted">@{profile.handle}</span>
        <p>{profile.bio}</p>
        <div className="row center">
          {id !== "booplio" &&
            user?.uid !== id &&
            (user ? (
              <BusyButton
                action={async () => {
                  await call("followCreator", {
                    creatorId: id,
                    follow: !following.includes(id!),
                  });
                }}
              >
                {following.includes(id!) ? "Following" : "Follow creator"}
                <Plus size={17} />
              </BusyButton>
            ) : (
              <Link to="/account" className="button">
                Sign in to follow
              </Link>
            ))}
          {user?.uid === id && (
            <Link className="button secondary" to="/account">
              Edit profile <ArrowUpRight size={17} />
            </Link>
          )}
        </div>
        <div className="profile-stats">
          <span>
            <strong>{items.length}</strong>dents
          </span>
          <span>
            <strong>
              {id === "booplio"
                ? "Free"
                : items
                    .reduce((n, d) => n + (d.downloads || 0), 0)
                    .toLocaleString()}
            </strong>
            {id === "booplio" ? "for everyone" : "downloads"}
          </span>
        </div>
      </div>
      <div className="section-heading">
        <h2>Made with a little love.</h2>
      </div>
      {items.length ? (
        <div className="dent-grid">
          {items.map((d) => (
            <DentCard key={d.id} dent={d} />
          ))}
        </div>
      ) : (
        <Empty title="Lovely things take a little time.">
          No published dents here yet.
        </Empty>
      )}
    </div>
  );
}
export function Activity() {
  const { user, dents, following, saved, toast } = useStore();
  const [tab, setTab] = useState("updates"),
    [extra, setExtra] = useState<Dent[]>([]),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!db || !user) return;
    let active = true;
    setLoading(true);
    const load = async () => {
      const found: Dent[] = [];
      for (let i = 0; i < following.length; i += 10) {
        const ds = await getDocs(
          query(
            collection(db!, "dents"),
            where("status", "==", "published"),
            where("ownerId", "in", following.slice(i, i + 10)),
          ),
        );
        found.push(...ds.docs.map((d) => ({ id: d.id, ...d.data() }) as Dent));
      }
      const missing = saved.filter(
        (s) =>
          !dents.some((d) => d.id === s.id) &&
          !found.some((d) => d.id === s.id),
      );
      for (const s of missing) {
        try {
          const d = await getDoc(doc(db!, "dents", s.id));
          if (d.exists()) found.push({ id: d.id, ...d.data() } as Dent);
        } catch {}
      }
      if (active) setExtra(found);
    };
    void load()
      .catch((e) => toast(e.message))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    user,
    following.join(","),
    saved.map((s) => s.id + ":" + s.savedVersion).join(","),
  ]);
  const all = [...new Map([...dents, ...extra].map((d) => [d.id, d])).values()];
  const items = all.filter((d) =>
    tab === "following"
      ? following.includes(d.ownerId)
      : saved.some((s) => s.id === d.id && s.savedVersion !== d.version),
  );
  return (
    <div className="content-wrap">
      <PageHeading
        eyebrow="GOOD LITTLE NEWS"
        title="A little catch-up."
        description="Fresh releases and updates from your favorite corners."
      />
      <div className="tabs">
        <button
          className={tab === "updates" ? "active" : ""}
          onClick={() => setTab("updates")}
        >
          Updates
        </button>
        <button
          className={tab === "following" ? "active" : ""}
          onClick={() => setTab("following")}
        >
          Following
        </button>
      </div>
      {!user ? (
        <Empty
          title="Your little feed awaits."
          action={
            <Link className="button" to="/account">
              Sign in
            </Link>
          }
        >
          Follow creators and save dents to see what’s new.
        </Empty>
      ) : loading ? (
        <p className="loading-line">Catching up with your little corner…</p>
      ) : items.length ? (
        <div className="dent-grid">
          {items.map((d) => (
            <DentCard key={d.id} dent={d} />
          ))}
        </div>
      ) : (
        <Empty
          title="All quiet in your little corner."
          action={
            <Link className="button secondary" to="/search">
              Find something new <ArrowUpRight size={17} />
            </Link>
          }
        >
          Save dents or follow a creator. Their latest designs will show up
          here.
        </Empty>
      )}
    </div>
  );
}
