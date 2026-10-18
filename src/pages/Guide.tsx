import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Download,
  Code2,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { PageHeading, BusyButton } from "../components/UI";
import { saveFile } from "../files";
export function Guide() {
  return (
    <div className="content-wrap narrow">
      <PageHeading
        eyebrow="SMALL DETAILS. ENDLESS POSSIBILITIES."
        title="A little guide to dents."
        description="A dent is a little shape that grows from the edge of your screen. What goes inside? That’s where you come in."
      />
      <div className="guide-intro">
        <span>
          <Smartphone size={30} />
        </span>
        <h2>Your phone, a little more you.</h2>
        <p>
          Booplio’s custom dents change the visuals inside your charging,
          volume, brightness, camera and headphone overlays. The shape, gestures
          and controls stay native.
        </p>
      </div>
      <section className="prose">
        <h2>Found something you love?</h2>
        <ol className="guide-steps">
          <li>
            <strong>Send your dent to Booplio.</strong>
            <p>
              Open its page and tap Open in Booplio. Version 2.7.0 or later shows a dent with the design name and category. Review it, then confirm the import or choose Ignore. No marketplace account needed.
            </p>
          </li>
          <li>
            <strong>Prefer a file? Download HTML.</strong>
            <p>If the app doesn’t open, download the HTML file, then go to Booplio → Settings → Custom dent designs. You can also use your file manager’s Open with or Share option and choose Booplio.</p>
          </li>
          <li>
            <strong>Pick the matching category.</strong>
            <p>
              Choose charging, headphones, volume, brightness or camera, then
              import your downloaded HTML file.
            </p>
          </li>
          <li>
            <strong>Give it a little test.</strong>
            <p>
              Preview it, enable the custom design, and adjust placement and
              size in Booplio. Disable it any time to return to the built-in
              visuals.
            </p>
          </li>
        </ol>
        <p>
          Import copies the file into Booplio. To update an installed dent,
          download the newer file and import it again. Camera designs change the
          visuals only; supported camera controls still depend on your device.
        </p>
        <h2>Made something lovely?</h2>
        <p>
          Use one self-contained UTF-8 HTML file, up to 1 MiB. Put your CSS and
          JavaScript inline, and embed any fonts or images as data URLs.
          External files, network requests, storage, popups and Android bridges
          are unavailable.
        </p>
        <BusyButton
          className="button lime"
          action={async () => {
            const r = await fetch(
              `${import.meta.env.BASE_URL}dents/starter.html`,
            );
            if (!r.ok)
              throw new Error("Starter file could not load. Please retry.");
            saveFile(await r.text(), "booplio-dent-starter.html");
          }}
        >
          <Download size={17} />
          Download creator starter
        </BusyButton>
        <h3>A little conversation with Booplio.</h3>
        <p>
          Your design receives a message from its parent with type{" "}
          <code>dentupdate</code>. Check that it comes from <code>parent</code>,
          then read <code>event.data.data</code>. Schema 1 includes{" "}
          <code>kind</code>, <code>title</code>, <code>edge</code> and{" "}
          <code>progress</code>. Control dents also include level and value.
          Connection dents can include connected, playing and selected metrics.
        </p>
        <pre className="source-view">{`addEventListener('message', event => {\n  if (event.source !== parent) return;\n  if (event.data?.type !== 'dentupdate') return;\n  const data = event.data.data;\n  document.querySelector('#value').textContent =\n    data.value || data.title || '';\n});`}</pre>
        <p>
          Progress can be null. Metrics can be absent. Camera pinch mode can
          provide a text value with no numeric level. Use the formatted value
          for the camera readout, and never assume a measured zoom ratio.
        </p>
        <h3>Make it lovely everywhere.</h3>
        <ul>
          <li>
            Test left, right, top and bottom edges, including shallow depths.
          </li>
          <li>
            Use clear contrast and readable text. Keep everything inside the
            available space.
          </li>
          <li>Respect reduced motion and keep animation lightweight.</li>
          <li>
            Use textContent for values, and include only assets you have
            permission to share.
          </li>
        </ul>
        <p>
          JavaScript previews are isolated but have no CPU time limit. Only
          preview or import code from creators you trust. The marketplace
          preview uses sample values; test your final design in Booplio too.
        </p>
        <Link className="button" to="/studio">
          <Code2 size={18} />
          Share your first dent <ArrowUpRight size={17} />
        </Link>
        <h2>Our little community rules.</h2>
        <p>
          Everything shared here must be free to download. Credit others’ work,
          follow your chosen license, keep titles and previews honest, and don’t
          upload harmful, deceptive or inappropriate content. Use Report this
          dent if something needs attention.
        </p>
        <p>
          <Sparkles size={17} /> Good little things are better when everyone
          feels welcome.
        </p>
      </section>
    </div>
  );
}
export function Legal({ privacy = false }: { privacy?: boolean }) {
  return (
    <div className="content-wrap narrow">
      <PageHeading
        eyebrow="THE LITTLE DETAILS"
        title={privacy ? "Your privacy matters." : "A few community terms."}
        description="Updated 17 October 2026"
      />
      <article className="prose">
        {privacy ? (
          <>
            <p>
              This policy covers the Booplio marketplace website operated by
              Redstoneinvente Game Studio. It is separate from the Booplio
              Android app’s privacy policy.
            </p>
            <h2>What the marketplace uses</h2>
            <p>
              You can browse and download public dents without an account. If
              you sign in, Firebase Authentication processes your email address
              and sign-in information. Your chosen display name, username, bio
              and published creations are public. Your email address is not
              shown on your public profile.
            </p>
            <p>
              We store your uploads, listing details, version history, review
              feedback, saved collections, followed creators and reports to
              provide marketplace features. Reports are visible to moderators.
              Firebase and Google Cloud process service requests and may retain
              operational logs, including network information.
            </p>
            <h2>Your browser</h2>
            <p>
              Local storage remembers reduced motion preferences, downloaded
              versions and the email address needed to complete email-link
              sign-in. Firebase stores authentication state so you remain signed
              in. This site does not include advertising or optional analytics
              trackers. If enabled by the operator, Firebase App Check uses
              Google reCAPTCHA to help prevent automated abuse.
            </p>
            <h2>File previews and download counts</h2>
            <p>
              Creator HTML runs in a sandboxed frame with network requests
              blocked. Preview controls send sample values only. Cloud functions
              use hashed request identifiers for daily rate limits and download
              deduplication. Temporary records expire after approximately two
              days; scheduled cleanup removes expired records in batches.
            </p>
            <h2>Your choices</h2>
            <p>
              Edit your public profile and remove saved items in your account.
              Unpublish a dent in your studio. Delete your account in settings
              to remove your profile, uploaded files, dents and collections.
              Reauthenticate first. Operational logs, moderation records and
              other people’s downloaded copies may remain.
            </p>
            <h2>Questions</h2>
            <p>
              Contact the operator through{" "}
              <a
                href="https://github.com/Redstoneinvente/Booplio-Landing/issues"
                target="_blank"
                rel="noreferrer"
              >
                the Booplio Landing issue tracker
              </a>
              . Do not post private account details publicly. Service providers
              include Google Firebase and the hosting provider used for this
              website.
            </p>
          </>
        ) : (
          <>
            <h2>Free means free</h2>
            <p>
              Every dent on this marketplace is free to download. You do not
              need an account to download public designs. Creators must have the
              right to distribute everything included in their uploads.
            </p>
            <h2>Your creations</h2>
            <p>
              You keep ownership of your work. Publishing gives the marketplace
              permission to host, preview and distribute your submitted files
              and listing information. Your chosen Creative Commons license sets
              the permissions for other people’s reuse. Read it before
              publishing. Unpublishing does not revoke rights already granted
              under that license.
            </p>
            <h2>Keep it lovely</h2>
            <p>
              No harmful code, stolen assets, harassment, deception or
              inappropriate uploads. Do not try to bypass preview restrictions,
              access other users’ data or inflate metrics. Moderators may reject
              submissions, request changes or remove content that violates these
              rules.
            </p>
            <h2>Use with care</h2>
            <p>
              Dents contain creator-written HTML and JavaScript. Review is not a
              guarantee of safety, compatibility or performance. Import designs
              you trust, keep backups, and test them on your device. The service
              and community designs are provided as available, subject to rights
              that apply under law.
            </p>
            <h2>Your account</h2>
            <p>
              Keep your sign-in account secure. You can unpublish your dents or
              delete your marketplace account from settings. Follow the license
              on any design you download, even if the creator later leaves the
              marketplace.
            </p>
            <h2>Changes and contact</h2>
            <p>
              These terms may be updated as the community grows. Questions or
              content concerns can be raised through{" "}
              <a
                href="https://github.com/Redstoneinvente/Booplio-Landing/issues"
                target="_blank"
                rel="noreferrer"
              >
                the project’s issue tracker
              </a>
              .
            </p>
          </>
        )}
      </article>
    </div>
  );
}
