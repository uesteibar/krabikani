import Image from 'next/image';
import { CrabLogo } from './CrabLogo';

const screenshots = [
  { src: '/images/home.png', alt: 'Krabikani dashboard with WaniKani lessons and reviews' },
  { src: '/images/review.png', alt: 'Krabikani WaniKani review question on Android' },
  { src: '/images/lesson.png', alt: 'Krabikani WaniKani lesson card on Android' },
  { src: '/images/search.png', alt: 'Krabikani full text search for WaniKani subjects' },
];

const features = [
  {
    title: 'Built for Android flow',
    body: 'A phone-native review interface that keeps the keyboard and focus where you need them, so WaniKani reviews feel faster than using the desktop web UI on mobile.',
  },
  {
    title: 'Works offline',
    body: 'Subjects and assignments are stored locally with SQLite. Study when connection is spotty and sync queued progress when you are back online.',
  },
  {
    title: 'Lessons, reviews, and search',
    body: 'Do WaniKani lessons, run SRS review sessions, wrap up naturally, use zen mode, and search learned radicals, kanji, and vocabulary.',
  },
  {
    title: 'Friendly reminders',
    body: 'Hourly notifications can help you avoid review pileups when your available WaniKani reviews climb too high.',
  },
];

const comparisons = [
  ['Mobile ergonomics', 'Designed around Android input, touch, and short study sessions.'],
  ['Offline-first study', 'Keep studying with a local database and sync later.'],
  ['Focused review mode', 'Wrap-up mode and zen mode help you stay in the review flow.'],
  ['Official data', 'Uses your WaniKani API key and syncs with WaniKani rather than replacing it.'],
];

export default function Home() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Krabikani',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Android',
    description:
      'Krabikani is an Android companion app for WaniKani with offline reviews, lessons, search, notifications, and a focused mobile interface.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    screenshot: screenshots.map(screenshot => screenshot.src),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <nav className="nav" aria-label="Primary navigation">
        <div className="brand">
          <CrabLogo />
          <a href="#top" aria-label="Krabikani home">Krabikani</a>
        </div>
        <div className="navLinks">
          <a href="#features">Features</a>
          <a href="/compare">Compare</a>
          <a href="#faq">FAQ</a>
        </div>
      </nav>

      <section id="top" className="hero section">
        <div className="heroText">
          <p className="eyebrow">Android app for WaniKani</p>
          <h1>A WaniKani Android app for focused reviews.</h1>
          <p className="lede">
            Krabikani syncs with WaniKani and gives you a mobile-first alternative to using
            the web version on your phone: lessons, reviews, search, and offline study without
            leaving your Android flow.
          </p>
          <div className="ctaRow">
            <a className="button primary" href="https://github.com/uesteibar/krabikani/releases/download/latest/app-release.apk">Download APK</a>
            <a className="button secondary" href="#get-started">How to set up</a>
            <a className="button secondary" href="https://github.com/uesteibar/krabikani">View source</a>
          </div>
          <p className="note">
            Krabikani is an independent companion app. WaniKani is a trademark of Tofugu LLC.
          </p>
        </div>
        <div className="heroCard" aria-label="Krabikani app screenshots">
          <Image className="phone mainPhone" src="/images/review.png" alt="Krabikani review screen" width={270} height={585} priority loading="eager" />
          <Image className="phone sidePhone" src="/images/home.png" alt="Krabikani dashboard" width={220} height={477} />
        </div>
      </section>

      <section className="section intro" aria-labelledby="why-title">
        <div>
          <p className="eyebrow">Why Krabikani?</p>
          <h2 id="why-title">A WaniKani Android app for people who actually review on their phone.</h2>
        </div>
        <p>
          The official WaniKani website is great, but mobile browser study is not always the smoothest
          way to clear a review queue. Krabikani keeps WaniKani as your source of truth while adding
          Android-native ergonomics, local storage, and review-focused interactions.
        </p>
      </section>

      <section id="features" className="section featureGrid" aria-label="Krabikani features">
        {features.map(feature => (
          <article className="feature" key={feature.title}>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="section comparison" aria-labelledby="compare-title">
        <div>
          <p className="eyebrow">Alternative to mobile web</p>
          <h2 id="compare-title">What makes it a good WaniKani Android option?</h2>
        </div>
        <div className="comparisonList">
          {comparisons.map(([title, body]) => (
            <div className="comparisonItem" key={title}>
              <strong>{title}</strong>
              <span>{body}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="screenshots" className="section" aria-labelledby="screenshots-title">
        <p className="eyebrow">Screenshots</p>
        <h2 id="screenshots-title">Reviews, lessons, dashboard, and search.</h2>
        <div className="screenshots">
          {screenshots.map(screenshot => (
            <Image className="screenshot" key={screenshot.src} src={screenshot.src} alt={screenshot.alt} width={240} height={520} />
          ))}
        </div>
      </section>

      <section id="get-started" className="section getStarted" aria-labelledby="get-started-title">
        <div>
          <p className="eyebrow">Get started</p>
          <h2 id="get-started-title">Bring your WaniKani API key.</h2>
          <p>
            Download the latest APK, install Krabikani, open Settings, paste a WaniKani personal
            access token, and the app syncs your subjects, lessons, reviews, and assignments.
          </p>
        </div>
        <ol>
          <li><a href="https://github.com/uesteibar/krabikani/releases/download/latest/app-release.apk">Download the latest Android APK</a>.</li>
          <li>Generate a personal access token in WaniKani account settings.</li>
          <li>Paste it into Krabikani settings on Android.</li>
          <li>Sync once, then study from the dashboard even when you go offline.</li>
        </ol>
      </section>

      <section id="faq" className="section faq" aria-labelledby="faq-title">
        <p className="eyebrow">FAQ</p>
        <h2 id="faq-title">Questions about Krabikani and WaniKani on Android.</h2>
        <details>
          <summary>Is Krabikani an official WaniKani app?</summary>
          <p>No. Krabikani is an independent companion app that uses the WaniKani API.</p>
        </details>
        <details>
          <summary>Does Krabikani replace my WaniKani account?</summary>
          <p>No. You still need a WaniKani account. Krabikani syncs with your WaniKani data.</p>
        </details>
        <details>
          <summary>Why use an Android app instead of the WaniKani website?</summary>
          <p>An Android app can provide offline storage, native notifications, and a review interface tailored for mobile input.</p>
        </details>
      </section>

      <footer className="footer">
        <span>Krabikani</span>
        <span>Independent WaniKani companion for Android.</span>
      </footer>
    </main>
  );
}
