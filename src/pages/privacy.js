import { footerHTML } from '../components/footer.js';

// Plain-language privacy notice. Keep it true to what the code actually does:
// if you add a new service or start collecting something new, update this page and DECISIONS_LOG.
const UPDATED = '25 September 2026';
const CONTACT = 'vikmunala@gmail.com';

export function renderPrivacy(app) {
  document.title = "Privacy — The Villager's Notes";

  app.innerHTML = `
    <article class="entry-page privacy-page">
      <div class="container">
        <div><a href="/" class="label back-link">← HOME</a></div>

        <h1 class="entry-title" style="margin-top:2rem;">Privacy</h1>
        <p class="entry-standfirst">The short version: we collect only what we need to take your payment, deliver your order, or write back to you. We don't sell it and we don't use it for advertising.</p>

        <div class="prose-note entry-body privacy-body">
          <p>This site is run by Vic Munala. When this page says “we”, it means Vic and Kasuku Studio, the studio that looks after the website. This notice was last updated on ${UPDATED}.</p>

          <h2>What we collect, and why</h2>
          <ul>
            <li><strong>Paying for a story, a tip, the book or the play recording:</strong> your M-Pesa phone number, so a payment prompt can be sent to your phone. The payment is handled by IntaSend. We never see your M-Pesa PIN.</li>
            <li><strong>Ordering the book:</strong> your name, phone number, delivery address and whether you want a signed copy, so it can be delivered to you.</li>
            <li><strong>Buying the play recording:</strong> your email address, so Vic can send you the private link.</li>
            <li><strong>Tips:</strong> your phone number and the amount, so Vic can see who supported the work.</li>
            <li><strong>Newsletter:</strong> your email address, to send you updates. You can ask to be removed at any time.</li>
            <li><strong>Comments:</strong> the name you type (it doesn't have to be your real one) and your comment. Comments are shown publicly under the story.</li>
            <li><strong>Likes:</strong> only a count. Your own device remembers that you liked a story.</li>
            <li><strong>Visits:</strong> Google Analytics counts visits (pages viewed, type of device, and roughly where in the world). Vic sees totals, not names.</li>
          </ul>

          <h2>What stays on your own device</h2>
          <p>Your browser keeps a few small notes so the site works properly: the receipt of a paid story you unlocked (so it stays open), the name you last used to comment, and which stories you liked. These are stored in your browser, not sent to us, and you can clear them any time in your browser settings. Clearing them means a paid story will ask you to unlock it again.</p>

          <h2>Who else handles your information</h2>
          <p>We use these services to run the site. Each of them only receives what it needs for its job.</p>
          <ul>
            <li><strong>IntaSend</strong>: processes M-Pesa payments.</li>
            <li><strong>Supabase</strong>: the database where orders, tips, comments and subscribers are stored.</li>
            <li><strong>Vercel</strong>: hosts the website.</li>
            <li><strong>Formspree</strong>: emails Vic when someone joins the newsletter.</li>
            <li><strong>Google Analytics</strong>: visit statistics. It uses cookies. You can block them in your browser settings and the site will still work.</li>
          </ul>
          <p>Several of these companies store data outside Kenya.</p>

          <h2>Who can see it</h2>
          <p>Vic can see orders, tips and subscribers through a private, password-protected dashboard. Kasuku Studio can reach the database in order to maintain the site. Nobody else can. Comments are the only thing shown publicly.</p>

          <h2>How long we keep it</h2>
          <p>Order and payment records are kept for as long as they are needed for delivery, accounts and any dispute. Newsletter addresses are kept until you ask to be removed. Comments stay until you ask for one to be removed or Vic deletes it.</p>

          <h2>Your rights</h2>
          <p>Under Kenya's Data Protection Act, 2019, you can ask what we hold about you, ask us to correct it, or ask us to delete it. Email <a href="mailto:${CONTACT}">${CONTACT}</a> and we will reply. If you are unhappy with the answer, you can complain to the Office of the Data Protection Commissioner.</p>

          <h2>Security</h2>
          <p>The site is served over an encrypted connection. Orders and subscriber lists can only be read from the private dashboard. The full text of paid stories is not sent to your browser until payment has been confirmed.</p>

          <h2>Changes</h2>
          <p>If we change what we collect or who we use, we will update this page and the date at the top.</p>
        </div>
      </div>
    </article>`;

  app.insertAdjacentHTML('beforeend', footerHTML());
}
