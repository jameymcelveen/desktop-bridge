export const WORDS = [
  { ref: 'Joshua 1:9', text: 'Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.' },
  { ref: 'Micah 6:8', text: 'He has told you, O man, what is good; and what does the Lord require of you but to do justice, and to love kindness, and to walk humbly with your God?' },
  { ref: 'Colossians 3:23', text: 'Whatever you do, work heartily, as for the Lord and not for men.' },
  { ref: 'Proverbs 3:5–6', text: 'Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.' },
  { ref: 'Psalm 46:10', text: 'Be still, and know that I am God.' },
  { ref: 'Matthew 6:33', text: 'But seek first the kingdom of God and his righteousness, and all these things will be added to you.' },
  { ref: 'Philippians 4:6–7', text: 'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.' },
  { ref: 'John 13:34', text: 'A new commandment I give to you, that you love one another: just as I have loved you, you also are to love one another.' },
];

export function verseForDay(now = Date.now()) {
  const day = Math.floor(now / 86_400_000);
  return WORDS[day % WORDS.length];
}
