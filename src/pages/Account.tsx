import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
} from "firebase/auth";
import {
  ArrowUpRight,
  Mail,
  Bell,
  LogOut,
  SlidersHorizontal,
  ShieldCheck,
  Trash2,
  Code2,
  Heart,
} from "lucide-react";
import { useStore } from "../store";
import { auth, call, configured, errorMessage } from "../firebase";
import { PageHeading, BusyButton, Modal } from "../components/UI";
export function Account() {
  const {
    user,
    profile,
    admin,
    authLoading,
    refreshProfile,
    toast,
    reduced,
    setReduced,
  } = useStore();
  const [email, setEmail] = useState(
      localStorage.getItem("booplio-email-link") || "",
    ),
    [sent, setSent] = useState(false),
    [link, setLink] = useState(""),
    [name, setName] = useState(""),
    [handle, setHandle] = useState(""),
    [bio, setBio] = useState(""),
    [deleting, setDeleting] = useState(false),
    [confirm, setConfirm] = useState("");
  const nav = useNavigate();
  useEffect(() => {
    if (auth && isSignInWithEmailLink(auth, location.href))
      setLink(location.href);
  }, []);
  useEffect(() => {
    setName(profile?.displayName || user?.displayName || "");
    setHandle(profile?.handle || "");
    setBio(profile?.bio || "");
  }, [profile, user]);
  const finish = async () => {
    if (!auth) return;
    await signInWithEmailLink(auth, email, link);
    localStorage.removeItem("booplio-email-link");
    setLink("");
    history.replaceState(null, "", `${location.pathname}#/account`);
    toast("You’re in. Make yourself at home.");
  };
  if (authLoading)
    return (
      <div className="content-wrap">
        <p className="loading-line">
          <span className="spinner" />
          Just a moment…
        </p>
      </div>
    );
  if (!user)
    return (
      <div className="auth-layout">
        <div className="auth-story">
          <span className="eyebrow">
            A LITTLE COMMUNITY. A LOT OF CREATIVITY.
          </span>
          <h1>
            Good little
            <br />
            things happen
            <br />
            <span>together.</span>
          </h1>
          <p>
            A home for playful ideas, small details, and the people who make
            them.
          </p>
          <div className="auth-shapes">
            <span>✳</span>
            <i />
            <b>hello.</b>
          </div>
          <div className="row">
            <span className="pill">
              <Heart size={14} />
              Always free
            </span>
            <span className="pill">
              <Code2 size={14} />
              Made by everyone
            </span>
          </div>
        </div>
        <div className="auth-card">
          <Link className="brand" to="/">
            booplio
            <span />
          </Link>
          <h2>{link ? "One last little step." : "Make yourself at home."}</h2>
          <p>
            {link
              ? "Confirm the email address that received this sign-in link."
              : "Save favorites. Follow creators. Share your little creations."}
          </p>
          {!configured && (
            <div className="notice">
              Community accounts are opening soon. Starter dents are ready to
              download right now.
            </div>
          )}
          {!link && (
            <>
              <BusyButton
                className="button secondary full"
                disabled={!configured}
                action={async () => {
                  if (!auth) return;
                  await signInWithPopup(auth, new GoogleAuthProvider());
                  toast("Welcome to your little corner.");
                }}
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.4Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 22c2.7 0 5-1 6.6-2.4l-3.2-2.5c-.9.6-2.1 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H3v2.6A10 10 0 0 0 12 22Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.3 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9l3.3-2.6Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3 7.5l3.3 2.6A6 6 0 0 1 12 5.9Z"
                  />
                </svg>
                Continue with Google
              </BusyButton>
              <div className="divider">
                <span>or a little email magic</span>
              </div>
            </>
          )}
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void (
                link
                  ? finish()
                  : sendSignInLinkToEmail(auth!, email, {
                      url: `${location.origin}${location.pathname}#/account`,
                      handleCodeInApp: true,
                    }).then(() => {
                      localStorage.setItem("booplio-email-link", email);
                      setSent(true);
                    })
              ).catch((e) => toast(errorMessage(e)));
            }}
          >
            <label>
              Email address
              <div className="input-icon">
                <Mail size={18} />
                <input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </label>
            <button className="button full" disabled={!configured}>
              {link
                ? "Finish signing in"
                : sent
                  ? "Send another sign-in link"
                  : "Send sign-in link"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          {sent && (
            <div className="notice success">
              Check your inbox. Your sign-in link is on its way.
            </div>
          )}
          <Link to="/" className="browse-link">
            Just browsing? Come on in.
          </Link>
          <p className="fine-print">
            By continuing, you agree to our <Link to="/terms">Terms</Link> and{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    );
  return (
    <div className="content-wrap narrow">
      <PageHeading
        eyebrow="YOUR LITTLE CORNER"
        title={
          profile
            ? `Hello, ${profile.displayName.split(" ")[0]}.`
            : "Let’s make it yours."
        }
        description="A few details so the community knows who made the lovely stuff."
      />
      <div className="settings-card form-stack">
        <div className="row">
          <div className="avatar big">{(name || "b")[0]}</div>
          <div>
            <h3>Your creator profile</h3>
            <p className="muted">
              Your name, username and bio are public. Your email stays private.
            </p>
          </div>
        </div>
        <label>
          Display name
          <input
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Username
          <input
            maxLength={24}
            value={handle}
            placeholder="your_little_corner"
            onChange={(e) =>
              setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
          />
          <small>3–24 letters, numbers or underscores.</small>
        </label>
        <label>
          A little about you
          <textarea
            maxLength={240}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>
        <BusyButton
          disabled={name.trim().length < 2 || handle.length < 3}
          action={async () => {
            await call("saveProfile", { displayName: name, handle, bio });
            await refreshProfile();
            toast("Profile saved. Looking lovely.");
          }}
        >
          Save profile
        </BusyButton>
      </div>
      <div className="settings-card">
        <h2>Make yourself comfortable</h2>
        <label className="setting-row">
          <span>
            <SlidersHorizontal size={19} />
            Reduce motion
          </span>
          <input
            type="checkbox"
            checked={reduced}
            onChange={(e) => setReduced(e.target.checked)}
          />
        </label>
        <Link className="setting-row" to="/activity">
          <span>
            <Bell size={19} />
            Updates & following
          </span>
          <ArrowUpRight size={18} />
        </Link>
        <Link className="setting-row" to="/studio">
          <span>
            <Code2 size={19} />
            My creator studio
          </span>
          <ArrowUpRight size={18} />
        </Link>
        {admin && (
          <Link className="setting-row" to="/moderation">
            <span>
              <ShieldCheck size={19} />
              Review submissions & reports
            </span>
            <ArrowUpRight size={18} />
          </Link>
        )}
        <button
          className="setting-row"
          onClick={() => void signOut(auth!).then(() => nav("/"))}
        >
          <span>
            <LogOut size={19} />
            Sign out
          </span>
          <ArrowUpRight size={18} />
        </button>
        <button
          className="setting-row danger"
          onClick={() => setDeleting(true)}
        >
          <span>
            <Trash2 size={19} />
            Delete account
          </span>
        </button>
      </div>
      {deleting && (
        <Modal
          title="Leave this little corner?"
          onClose={() => setDeleting(false)}
        >
          <p>
            This permanently deletes your profile, uploaded dents, drafts, files
            and saved collection. Download anything you want to keep first.
          </p>
          <div className="form-stack">
            <label>
              Type DELETE to confirm
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <BusyButton
              className="button danger-button"
              disabled={confirm !== "DELETE"}
              action={async () => {
                await call("deleteAccount", {});
                await signOut(auth!);
                nav("/");
                toast("Your account and creations have been deleted.");
              }}
            >
              Delete my account
            </BusyButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
