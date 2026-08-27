// Seed script: inserts the 3 default stories into Supabase.
// Run ONCE from the project root:
//   node --env-file=.env scripts/seed-entries.mjs
//
// Requires Node 20+. Uses the project's installed @supabase/supabase-js.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
  console.error('Make sure .env exists and has both values, then run:');
  console.error('  node --env-file=.env scripts/seed-entries.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Hardcoded seed entries — copied from src/data/entries.js
const SEED_ENTRIES = [
  {
    id: 'in-the-wake-of-anam-s-wake-a-short-story-about-death',
    slug: 'in-the-wake-of-anam-s-wake-a-short-story-about-death',
    title: "In the Wake of Anam's Wake, a Short Story About Death",
    excerpt: '...because, maybe, death needs to die too.',
    category: 'Shorts',
    entry_date: '20 August 2026',
    author: 'Vic Munala',
    price: 0,
    preview_words: 100,
    likes: 0,
    sort_order: 3,
    body: [
      'It\u2019ll knock. And when it does, it doesn\u2019t give you a choice to open the door. Death will enter the room, take a corner seat where it can see everyone and the feelings written on their faces, and wait to be served tea. It doesn\u2019t put sugar in its tea, death.',
      'Death won\u2019t use a coaster. It will leave a mark on the table. Then it will leave you with the weight of grief. A weight you will carry for the rest of your life. A weight that might get lighter with time, but that\u2019s not exactly a guarantee.',
      "It\u2019ll not talk to you, because why should it? Death wants to see the family egos put to the test and their secrets revealed. It wants to see the world burn and doesn\u2019t deal with the consequences that come with that.",
      "It\u2019ll take the person you love and leave you to live with the emptiness. To live with that hurt. Death will teach you how to be numb, to never see the beauty in life. It will show you how to hide your emotions - to never express joy and to never feel loss. It will start killing you slowly.",
      'One day, death will die too.',
    ],
  },
  {
    id: 'musings-from-the-edge-of-a-blank-page',
    slug: 'musings-from-the-edge-of-a-blank-page',
    title: 'Musings From the Edge of a Blank Page',
    excerpt: "Part internal monologue, part creative meltdown, and part quiet sermon to anyone who\u2019s ever tried (and failed) to make sense of a blinking cursor on a screen.",
    category: 'Random Thoughts',
    entry_date: '18 August 2026',
    author: 'Vic Munala',
    price: 0,
    preview_words: 100,
    likes: 1,
    sort_order: 2,
    body: [
      'The cursor always blinks. It always does. Annoyingly so.',
      'It is an eyesore, especially on days like today.',
      "It doesn\u2019t care how you slept the previous night or whether you had breakfast when you woke up. Full disclosure: you didn\u2019t sleep well because sleep decided not to visit that night. When you called, she said you had misused her during the day. It turns out she is extremely jealous. You can\u2019t have her during the day, and also at night. It doesn\u2019t matter if you had talked about it before.",
      'Oh, and breakfast! Since there wasn\u2019t any leftover food, you went to buy bread. You don\u2019t like bread one bit. The shape, the design, the taste, the colour - whether white or brown - and even the brand. Everything about it is off. The only thing it has going for it is its convenience.',
      'When you get back, you realise you are out of blueband and eggs. Now you can\u2019t even make bread better. Of course, you are grateful you had breakfast, but it was a bad breakfast.',
      'The empty page is still staring at you. And asks questions.',
    ],
  },
  {
    id: 'tomorrow-the-lake-will-smile',
    slug: 'tomorrow-the-lake-will-smile',
    title: 'Tomorrow, the Lake Will Smile',
    excerpt: 'A fisherman reflects on the fortunes of the lake that has been the only source of his livelihood.',
    category: 'Essay',
    entry_date: '31 March 2024',
    author: 'Vic Munala',
    price: 0,
    preview_words: 100,
    likes: 0,
    sort_order: 1,
    body: [
      'The morning sunlight sneaks through the cracked wooden shutter and stabs at Oti\u2019s eyelids. He groans, drags the shuka over his head, and burrows deeper into the mat. The stink of the lake still clings to his skin, sweat tangled with fatigue. He still has a couple more hours of sleep before he has to wake up and face the day. The ghost of last night\u2019s empty nets hangs heavy, whispering what he already fears: the lake is changing, and maybe leaving him behind.',
      'Everyone calls him "Oti." Of course, that\u2019s not his real name. But is there a better generic name for a story about a fisherman in Nam Lolwe than that?',
      'Oti steps outside to a day already humming. His mabati-roofed house, flanked by two leaning mango trees and a rickety bench where his wife perches for the day\u2019s gossip, sits quietly as neighbours pass.',
    ],
  },
];

console.log('Seeding entries to Supabase...');
const { data, error } = await supabase
  .from('entries')
  .upsert(SEED_ENTRIES, { onConflict: 'id' })
  .select('id');

if (error) {
  console.error('Seed FAILED:', error.message);
  process.exit(1);
} else {
  console.log(`SUCCESS: Seeded ${data.length} entries.`);
  data.forEach(r => console.log(' -', r.id));
}
