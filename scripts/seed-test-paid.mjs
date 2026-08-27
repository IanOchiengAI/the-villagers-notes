import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const previewBody = [
  'The matatu to Eastlands is always packed on a Friday evening. Achieng knows this, yet she still leaves the office at 5:47 PM — thirteen minutes after everyone else, because she cannot stand the scramble at the door. She likes to be last. She likes the quiet of a near-empty corridor, the echo of her own heels, the small mercy of choosing her own seat.',
  'Tonight the seat she chooses is next to a man holding a paper bag of mangoes on his lap...',
];

const fullBody = [
  'The matatu to Eastlands is always packed on a Friday evening. Achieng knows this, yet she still leaves the office at 5:47 PM — thirteen minutes after everyone else, because she cannot stand the scramble at the door. She likes to be last. She likes the quiet of a near-empty corridor, the echo of her own heels, the small mercy of choosing her own seat.',
  'Tonight the seat she chooses is next to a man holding a paper bag of mangoes on his lap. He smells of workshop oil and something sweet she cannot name. He does not look at her when she sits down. This is a relief.',
  'The matatu lurches into traffic. Outside, Nairobi does what Nairobi always does at this hour — it becomes a slow, amber argument. Bodabodas weave between buses. A hawker with a tray of phone chargers knocks on the window. Achieng watches him move down the line of traffic with the patient determination of someone who has made peace with rejection.',
  'She thinks about the email she did not send.',
  'It has been sitting in her drafts folder for eleven days. Addressed to her mother. Subject line: Things I should have said at the funeral. The body of the email is four paragraphs that she rewrites every few nights, always ending with the same word — sorry — and never pressing send.',
  'The man with the mangoes shifts in his seat. One rolls out of the bag and bumps against her shoe. They both reach for it at the same time.',
  '"Sorry," he says. His voice is low, the kind that seems surprised to be heard.',
  '"It is fine," she says. She picks up the mango and hands it to him.',
  'He takes it. Pauses. Then holds it back out to her. "Do you want it? I have too many."',
  'She almost says no — she almost always says no — but something about the frankness of the offer stops her. She takes the mango. It is warm from his lap. She holds it for the rest of the journey without eating it, and when she gets off at her stop she is still holding it, and she does not know what that means, but it feels important.',
  'Later, she will open the email to her mother. She will delete the word sorry. She will type: I kept a mango for you once. You were not there. I ate it alone and it was the sweetest thing I have ever tasted and I have never told anyone that until now.',
  'She will press send this time. She will not know if it is the right thing. But she will press send.',
];

const testEntry = {
  id: 'the-mango-on-the-matatu',
  slug: 'the-mango-on-the-matatu',
  title: 'The Mango on the Matatu',
  excerpt: 'A short story about a Friday evening, a mango, and an email that never gets sent.',
  category: 'Shorts',
  entry_date: '27 August 2026',
  author: 'Vic Munala',
  price: 50,
  preview_words: 100,
  likes: 0,
  body: previewBody,
  full_body: fullBody,
  sort_order: Math.floor(Date.now() / 1000),
};

const { data, error } = await sb.from('entries').upsert(testEntry, { onConflict: 'id' }).select('id, price');
if (error) {
  console.error('FAILED:', error.message);
} else {
  console.log('SUCCESS:');
  console.log(JSON.stringify(data, null, 2));
}
