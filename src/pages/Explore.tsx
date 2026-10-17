import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  SlidersHorizontal,
  Search,
  X,
  Sparkles,
  Heart,
  Code2,
  Check,
} from "lucide-react";
import { useCatalog } from "../catalog";
import { categories, categoryLabels } from "../types";
import {
  CategoryIcon,
  DentCard,
  PhoneArt,
  PageHeading,
  Empty,
  Modal,
} from "../components/UI";
import { starters } from "../starters";
export function Explore({
  searchPage = false,
  collection = false,
}: {
  searchPage?: boolean;
  collection?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(false);
  const text = params.get("q") || "",
    category = params.get("category") || "all",
    style = params.get("style") || "all",
    edge = params.get("edge") || "all",
    sort = params.get("sort") || "featured";
  const { dents, loading, more, loadMore, catalogError } = useCatalog(
    text,
    category,
  );
  const set = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    if (!value || value === "all") p.delete(key);
    else p.set(key, value);
    setParams(p, { replace: true });
  };
  const results = dents
    .filter(
      (d) =>
        (category === "all" || d.category === category) &&
        (style === "all" || d.style === style) &&
        (edge === "all" || d.edge === edge || d.edge === "any") &&
        (!collection || d.style === "minimal") &&
        (!params.has("motion") || d.reducedMotion) &&
        (!params.has("colors") || d.customColors) &&
        text
          .trim()
          .toLowerCase()
          .split(/\s+/)
          .every((t) =>
            `${d.title} ${d.description} ${d.ownerName} ${d.ownerHandle} ${d.tags.join(" ")} ${d.style}`
              .toLowerCase()
              .includes(t),
          ),
    )
    .sort((a, b) =>
      sort === "popular"
        ? (b.downloads || 0) - (a.downloads || 0)
        : sort === "newest"
          ? (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
          : 0,
    );
  const fullHome = !searchPage && !collection && !params.size;
  return (
    <>
      <div className="content-wrap">
        {fullHome ? (
          <>
            <div className="hero">
              <div className="hero-copy">
                <span className="eyebrow">
                  <span className="live-dot" /> ALWAYS FREE. MADE BY EVERYONE.
                </span>
                <h1>
                  Little dents.
                  <br />
                  Big <span>personality.</span>
                  <i className="hero-spark">✳</i>
                </h1>
                <p>
                  Your phone, with a little extra you. Discover playful
                  screen-edge designs made by the Booplio community.
                </p>
                <div className="row hero-actions">
                  <button
                    className="button lime"
                    onClick={() =>
                      document
                        .getElementById("dents")
                        ?.scrollIntoView({
                          behavior: matchMedia(
                            "(prefers-reduced-motion: reduce)",
                          ).matches
                            ? "auto"
                            : "smooth",
                        })
                    }
                  >
                    Find your next dent <ArrowRight size={19} />
                  </button>
                  <Link to="/guide" className="text-link">
                    What's a dent? <ArrowUpRight size={16} />
                  </Link>
                </div>
                <div className="hero-note">
                  <Heart size={15} /> No prices. No paywalls. Just good little
                  things.
                </div>
              </div>
              <Link className="hero-feature" to={`/dent/${starters[0].id}`}>
                <PhoneArt dent={starters[0]} large />
                <div className="feature-caption">
                  <span className="pill">Meet your new favorite</span>
                  <h2>
                    Citrus Charge <ArrowUpRight />
                  </h2>
                  <p>A fresh burst of energy for your edge.</p>
                </div>
                <span className="hero-sticker">
                  100%
                  <br />
                  free stuff
                </span>
              </Link>
            </div>
            <div className="category-header">
              <h2>A dent for every little moment.</h2>
              <span>Pick your kind of playful</span>
            </div>
            <div className="category-grid">
              {categories.map((c, i) => (
                <button
                  className={`category-tile tint-${i}`}
                  key={c}
                  onClick={() => set("category", c)}
                >
                  <CategoryIcon kind={c} size={25} />
                  <span>{categoryLabels[c]}</span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <PageHeading
            eyebrow={
              collection ? "THE LITTLE COLLECTIONS" : "FIND YOUR NEXT FAVORITE"
            }
            title={
              collection
                ? "Small, simple, lovely."
                : category !== "all"
                  ? `${categoryLabels[category as keyof typeof categoryLabels] || "All"} dents`
                  : "Search & discover"
            }
            description={
              collection
                ? "Clean looks. Gentle animations. A little less, beautifully done."
                : "Find the little thing that makes your phone feel like yours."
            }
          />
        )}
        <section id="dents" className="catalog-section">
          <div className="catalog-heading">
            <div>
              <span className="eyebrow">
                A LITTLE SOMETHING FOR YOUR SCREEN
              </span>
              <h2>
                {fullHome
                  ? "Fresh picks. All free."
                  : collection
                    ? "The minimal essentials"
                    : "Find your little favorite."}
              </h2>
            </div>
            <Link className="text-link" to="/studio">
              Share something you made <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="catalog-tools">
            <div className="search-field">
              <Search size={19} />
              <input
                aria-label="Search dents and creators"
                placeholder="Search dents, styles, creators…"
                value={text}
                onChange={(e) => set("q", e.target.value)}
              />
              {text && (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => set("q", "")}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              className="button secondary"
              onClick={() => setFilters(true)}
            >
              <SlidersHorizontal size={17} />
              Filters
              {[style, edge].some((x) => x !== "all") && (
                <span className="live-dot" />
              )}
            </button>
            <label className="sort-label">
              <span>Sort</span>
              <select
                aria-label="Sort dents"
                value={sort}
                onChange={(e) => set("sort", e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="popular">Most downloaded</option>
              </select>
            </label>
          </div>
          <div className="chips category-chips">
            <button
              className={category === "all" ? "selected" : ""}
              onClick={() => set("category", "all")}
            >
              All dents{" "}
              <span>
                {dents.length}
                {more ? "+" : ""}
              </span>
            </button>
            {categories.map((c) => (
              <button
                className={category === c ? "selected" : ""}
                key={c}
                onClick={() => set("category", c)}
              >
                <CategoryIcon kind={c} size={15} />
                {categoryLabels[c]}
              </button>
            ))}
          </div>
          {results.length ? (
            <div className="dent-grid">
              {results.map((d) => (
                <DentCard key={d.id} dent={d} />
              ))}
            </div>
          ) : (
            !loading && (
              <Empty
                title="Nothing here just yet."
                action={
                  <button
                    className="button secondary"
                    onClick={() => setParams({})}
                  >
                    Clear filters
                  </button>
                }
              >
                Try another search or a different category.
              </Empty>
            )
          )}
          {catalogError && (
            <div className="notice error" role="alert">
              Community dents couldn't load. {catalogError}
              <button onClick={() => void loadMore()}>Try again</button>
            </div>
          )}
          {loading && (
            <p className="loading-line">
              <span className="spinner" /> Looking for little things…
            </p>
          )}
          {more && !loading && (
            <div className="center">
              <button
                className="button secondary"
                onClick={() => void loadMore()}
              >
                Load more {text ? "search results" : "dents"}
                <ArrowRight size={17} />
              </button>
              {text && (
                <p className="fine-print">
                  Load more to continue through matching community designs.
                </p>
              )}
            </div>
          )}
        </section>
        {fullHome && (
          <>
            <Link to="/collection/minimal" className="collection-banner">
              <div>
                <span className="eyebrow">THE MINIMAL ESSENTIALS</span>
                <h2>
                  Small, simple,
                  <br />
                  lovely.
                </h2>
                <p>Quiet details. Big difference.</p>
                <span className="button dark small">
                  Explore the collection <ArrowRight size={16} />
                </span>
              </div>
              <div className="collection-art">
                <PhoneArt dent={starters[3]} />
                <PhoneArt dent={starters[7]} />
              </div>
            </Link>
            <section className="creator-banner">
              <div className="creator-banner-icon">
                <Code2 size={40} />
                <Sparkles size={25} />
              </div>
              <div>
                <span className="eyebrow">
                  A LITTLE HTML. A LOT OF PERSONALITY.
                </span>
                <h2>Made something lovely?</h2>
                <p>Give it a home. Share your dent with everyone, for free.</p>
              </div>
              <Link to="/studio" className="button">
                Start creating <ArrowUpRight size={18} />
              </Link>
            </section>
            <div className="value-strip">
              <span>
                <Check size={17} /> Every download is free
              </span>
              <span>
                <Check size={17} /> Made by real people
              </span>
              <span>
                <Check size={17} /> A little more you
              </span>
            </div>
          </>
        )}
      </div>
      {filters && (
        <Modal title="Find your kind of dent" onClose={() => setFilters(false)}>
          <div className="form-stack">
            <label>
              Style
              <select
                value={style}
                onChange={(e) => set("style", e.target.value)}
              >
                {["all", "playful", "minimal", "neon", "retro"].map((x) => (
                  <option key={x} value={x}>
                    {x === "all" ? "Any style" : x}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Screen edge
              <select
                value={edge}
                onChange={(e) => set("edge", e.target.value)}
              >
                {["all", "left", "right", "top", "bottom"].map((x) => (
                  <option key={x} value={x}>
                    {x === "all" ? "Any edge" : x}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={params.has("motion")}
                onChange={(e) => set("motion", e.target.checked ? "true" : "")}
              />
              Supports reduced motion
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={params.has("colors")}
                onChange={(e) => set("colors", e.target.checked ? "true" : "")}
              />
              Supports custom colors
            </label>
            <div className="row">
              <button
                className="button secondary"
                onClick={() => setParams({})}
              >
                Reset filters
              </button>
              <button className="button lime" onClick={() => setFilters(false)}>
                Show {results.length} dents
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
