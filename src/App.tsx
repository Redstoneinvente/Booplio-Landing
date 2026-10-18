import { Component, useEffect, useState, type ReactNode } from "react";
import {
  HashRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Search,
  Bookmark,
  UserRound,
  Bell,
  ArrowUpRight,
  Menu,
  X,
  Home,
  Sparkles,
  WifiOff,
  Plus,
} from "lucide-react";
import { useStore } from "./store";
import { Explore } from "./pages/Explore";
import { OpenTemplate } from "./pages/OpenTemplate";
import { Detail } from "./pages/Detail";
import { Account } from "./pages/Account";
import { Creator, SavedPage, Activity } from "./pages/Community";
import { Studio, Editor } from "./pages/Studio";
import { Moderation } from "./pages/Moderation";
import { Guide, Legal } from "./pages/Guide";
import { Empty } from "./components/UI";
function Shell() {
  const { user, notify } = useStore();
  const location = useLocation(),
    nav = useNavigate();
  const [mobile, setMobile] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    setMobile(false);
    window.scrollTo(0, 0);
    const heading = document.querySelector("main h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
    }
  }, [location.pathname]);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="Booplio home">
            booplio
            <span />
          </Link>
          <nav
            className={mobile ? "desktop-nav open" : "desktop-nav"}
            aria-label="Main navigation"
          >
            <NavLink end to="/">
              Explore
            </NavLink>
            <NavLink to="/collection/minimal">Collections</NavLink>
            <NavLink to="/guide">
              For creators <ArrowUpRight size={13} />
            </NavLink>
          </nav>
          <div className="header-actions">
            <Link
              className="icon-button"
              to="/search"
              aria-label="Search dents"
            >
              <Search size={20} />
            </Link>
            <Link
              className="icon-button desktop-only"
              to="/saved"
              aria-label="Saved dents"
            >
              <Bookmark size={20} />
            </Link>
            <Link
              className="icon-button desktop-only"
              to="/activity"
              aria-label="Updates and following"
            >
              <Bell size={19} />
            </Link>
            <Link
              className="button secondary small header-signin"
              to={user ? "/studio" : "/account"}
            >
              {user ? (
                <>
                  <Plus size={15} />
                  My studio
                </>
              ) : (
                "Come on in"
              )}
              <ArrowUpRight size={15} />
            </Link>
            <button
              className="icon-button menu-button"
              onClick={() => setMobile((x) => !x)}
              aria-label="Toggle navigation"
              aria-expanded={mobile}
            >
              {mobile ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      {!online && (
        <div className="offline-banner" role="status">
          <WifiOff size={16} />
          You’re offline. Your little corner will reconnect when you do.
        </div>
      )}
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route path="/search" element={<Explore searchPage />} />
          <Route path="/collection/:slug" element={<Explore collection />} />
          <Route path="/open-template" element={<OpenTemplate />} />
          <Route path="/dent/:id" element={<Detail />} />
          <Route path="/creator/:id" element={<Creator />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/account" element={<Account />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/studio/new" element={<Editor />} />
          <Route path="/studio/edit/:id" element={<Editor />} />
          <Route path="/moderation" element={<Moderation />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/privacy" element={<Legal privacy />} />
          <Route path="/terms" element={<Legal />} />
          <Route
            path="*"
            element={
              <div className="content-wrap">
                <Empty
                  title="A little lost?"
                  action={
                    <button className="button" onClick={() => nav("/")}>
                      Back to the good stuff
                    </button>
                  }
                >
                  This page wandered off. Let’s find you a dent.
                </Empty>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <Link to="/" className="brand">
              booplio
              <span />
            </Link>
            <p>Little dents. Big personality.</p>
            <span className="fine-print">
              Made with a little love by Redstoneinvente.
            </span>
          </div>
          <div className="footer-links">
            <Link to="/guide">A little help</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Community terms</Link>
            <a
              href="https://github.com/Redstoneinvente/Booplio-Landing"
              target="_blank"
              rel="noreferrer"
            >
              GitHub <ArrowUpRight size={13} />
            </a>
            {import.meta.env.VITE_PLAY_STORE_URL && (
              <a
                href={import.meta.env.VITE_PLAY_STORE_URL}
                target="_blank"
                rel="noreferrer"
              >
                Get Booplio <ArrowUpRight size={13} />
              </a>
            )}
          </div>
          <span className="footer-stamp">
            <Sparkles size={16} />
            Always free.
            <br />
            Always a little you.
          </span>
        </div>
      </footer>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <NavLink end to="/">
          <Home size={21} />
          Explore
        </NavLink>
        <NavLink to="/search">
          <Search size={21} />
          Search
        </NavLink>
        <NavLink to="/saved">
          <Bookmark size={21} />
          Saved
        </NavLink>
        <NavLink to="/account">
          <UserRound size={21} />
          Profile
        </NavLink>
      </nav>
      {notify && (
        <div className="toast" role="status">
          <Sparkles size={19} />
          {notify}
        </div>
      )}
    </>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="content-wrap">
        <Empty
          title="A little hiccup."
          action={
            <button className="button" onClick={() => window.location.reload()}>
              Try again
            </button>
          }
        >
          Reload the page to get back to the good stuff.
        </Empty>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Shell />
      </HashRouter>
    </ErrorBoundary>
  );
}
