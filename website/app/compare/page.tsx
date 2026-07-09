import type { Metadata } from 'next';
import { CrabLogo } from '../CrabLogo';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Best WaniKani Android Apps Compared',
  description:
    'An honest look at WaniKani Android companion apps: Smouldering Durtles, Krabikani, Mina, and Hakubun. Offline support, notifications, open source, and which one fits your study style.',
  alternates: {
    canonical: '/compare',
  },
  openGraph: {
    title: 'Best WaniKani Android Apps for WaniKani Reviews',
    description:
      'Compare Smouldering Durtles, Krabikani, Mina, and Hakubun for offline study, notifications, and review flow on Android.',
    url: '/compare',
  },
};

const apps = [
  {
    name: 'Smouldering Durtles',
    url: 'https://play.google.com/store/apps/details?id=com.smouldering_durtles.wk',
    description:
      'The most established Android WaniKani app and a fork of the original Flaming Durtles. It has the deepest feature set, including themes, script-like customisation, and an undo button.',
    pros: [
      'Most mature app with the largest user base',
      'Extensive customisation and theme support',
      'Undo button for correcting typos',
      'Active community and regular updates',
    ],
    cons: [
      'Can feel heavy with so many options',
      'Closed source',
      'Play Store only, no F-Droid or direct APK',
      'No Wear OS support',
    ],
    bestFor: 'Power users who want every feature and don\'t mind some complexity.',
  },
  {
    name: 'Krabikani',
    url: 'https://krabikani.app',
    description:
      'A minimalist, open-source WaniKani client built with React Native. Designed around a distraction-free review flow, offline-first storage, and a few thoughtful extras like typo tolerance and a Wear OS companion.',
    pros: [
      'Open source (GitHub)',
      'Offline-first with SQLite, syncs queued progress later',
      'Wear OS companion for review counts on your wrist',
      'Typo tolerance catches near-miss answers instead of marking them wrong',
      'Zen mode strips the review screen down to just the question and input',
      'Smart notifications warn when your review pile hits 20+',
      'Direct APK download, no store required',
    ],
    cons: [
      'Newer project with a smaller community',
      'No Play Store listing yet',
      'Fewer customisation options than Smouldering Durtles',
    ],
    bestFor: 'Learners who want something simple, open, and focused on review flow without distractions.',
  },
  {
    name: 'Mina',
    url: 'https://play.google.com/store/apps/details?id=com.codejockie.mina',
    description:
      'A modern, native Android app with a polished design language. Built as a clean alternative to the WaniKani mobile web experience with a focus on visual clarity.',
    pros: [
      'Polished, modern UI',
      'Native Android performance',
      'Good search functionality',
      'Active development on Play Store',
    ],
    cons: [
      'Closed source',
      'No Wear OS or offline-first design',
      'Smaller feature set than Smouldering Durtles',
    ],
    bestFor: 'Users who prioritise a clean, modern interface and want a Play Store install.',
  },
  {
    name: 'Hakubun',
    url: 'https://hakubun.app',
    description:
      'A cross-platform WaniKani app available on both Android and iOS. Still in beta, with a retro-inspired design and a focus on bridging the WaniKani web experience to mobile.',
    pros: [
      'Cross-platform (Android and iOS)',
      'Distinctive retro-inspired design',
      'Active development with regular beta updates',
    ],
    cons: [
      'Still in beta, some rough edges',
      'Closed source',
      'Smaller feature set than established apps',
      'No Wear OS support',
    ],
    bestFor: 'Early adopters who want a consistent experience across Android and iOS.',
  },
];

export default function Compare() {
  return (
    <main>
      <nav className="nav" aria-label="Primary navigation">
        <div className="brand">
          <CrabLogo />
          <Link href="/" aria-label="Krabikani home">Krabikani</Link>
        </div>
        <div className="navLinks">
          <Link href="/#features">Features</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/#faq">FAQ</Link>
        </div>
      </nav>

      <section className="section">
        <p className="eyebrow">WaniKani Android apps</p>
        <h1>Which WaniKani Android app should you use?</h1>
        <p className="lede">
          If you study kanji with WaniKani on your phone, the mobile website works but a dedicated
          Android app can feel faster, work offline, and send you notifications when reviews pile up.
          Here is an honest look at the main options in mid-2026.
        </p>
      </section>

      <section className="section" style={{ paddingTop: '2rem' }}>
        <h2>Quick comparison</h2>
        <div className="comparisonList" style={{ marginTop: '1.5rem' }}>
          {[
            ['Open source', 'No', 'Yes', 'No', 'No'],
            ['Offline study', 'Yes', 'Yes', 'Partial', 'Partial'],
            ['Push notifications', 'Yes', 'Yes', 'No', 'No'],
            ['Wear OS', 'No', 'Yes', 'No', 'No'],
            ['Typo tolerance', 'Via undo', 'Fuzzy match', 'No', 'No'],
            ['Zen / focus mode', 'No', 'Yes', 'No', 'No'],
            ['Play Store', 'Yes', 'No', 'Yes', 'No'],
            ['Direct APK', 'No', 'Yes', 'No', 'Yes'],
            ['Cross-platform', 'No', 'No', 'No', 'Yes'],
          ].map(([feature, smouldering, krabikani, mina, hakubun]) => (
            <div className="comparisonItem" key={feature}>
              <strong>{feature}</strong>
              <span style={{ display: 'flex', gap: '2rem' }}>
                <span>{smouldering}</span>
                <span>{krabikani}</span>
                <span>{mina}</span>
                <span>{hakubun}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="note" style={{ marginTop: '1rem' }}>
          Smouldering Durtles · Krabikani · Mina · Hakubun
        </p>
      </section>

      <section className="section" style={{ paddingTop: '2rem' }}>
        <h2>The apps in detail</h2>
        {apps.map(app => (
          <article key={app.name} style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <h3>
              <a href={app.url} style={{ color: '#ffc7ee' }}>{app.name}</a>
            </h3>
            <p style={{ color: 'var(--muted)', maxWidth: '44rem', lineHeight: 1.6 }}>
              {app.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
              <div>
                <h4 style={{ color: 'var(--green)', marginBottom: '0.5rem' }}>Strengths</h4>
                <ul style={{ color: 'var(--muted)', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
                  {app.pros.map(pro => <li key={pro}>{pro}</li>)}
                </ul>
              </div>
              <div>
                <h4 style={{ color: 'var(--pink)', marginBottom: '0.5rem' }}>Trade-offs</h4>
                <ul style={{ color: 'var(--muted)', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
                  {app.cons.map(con => <li key={con}>{con}</li>)}
                </ul>
              </div>
            </div>
            <p style={{ color: 'var(--muted)', marginTop: '1rem', fontStyle: 'italic' }}>
              {app.bestFor}
            </p>
          </article>
        ))}
      </section>

      <section className="section" style={{ paddingTop: '2rem' }}>
        <h2>If you want something simple and open</h2>
        <p style={{ color: 'var(--muted)', maxWidth: '44rem', lineHeight: 1.6 }}>
          Krabikani is the only option on this list that is fully open source. You can read the code,
          build it yourself, or grab the APK directly from krabikani.app. It does not need Google Play
          Services, and it comes with a Wear OS companion that none of the other apps offer.
        </p>
        <p style={{ color: 'var(--muted)', maxWidth: '44rem', lineHeight: 1.6, marginTop: '1rem' }}>
          The review experience is the focus: typo tolerance means you are not punished for
          fat-fingering a reading on a small keyboard, and Zen mode strips everything away so
          you can just work through your queue. When you are offline, everything is stored in
          SQLite and synced when you reconnect.
        </p>
        <div className="ctaRow" style={{ marginTop: '1.5rem' }}>
          <a className="button primary" href="/">Learn more about Krabikani</a>
          <a className="button secondary" href="https://github.com/uesteibar/krabikani/releases/download/latest/app-release.apk">Download APK</a>
        </div>
      </section>

      <footer className="footer">
        <span>Krabikani</span>
        <span>Independent WaniKani companion for Android.</span>
      </footer>
    </main>
  );
}
