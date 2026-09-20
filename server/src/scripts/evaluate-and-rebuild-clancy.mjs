import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Arshdeep's calibrated essay:
// - Deepens emotional resonance through the spectator's honest struggle with unresolved tragedy
// - Examines societal hunger for neat moral verdicts vs procedural boundaries
// - Zero invented juror dialogue, zero romanticizing tragedy, zero domestic melodrama
const deepenedEssay = `### The Long Shot of a Stay

On September 4, inside a Massachusetts courtroom, Judge William Sullivan signaled that he would declare a mistrial in the prosecution of Lindsay Clancy. The jury had concluded seven days and more than thirty-six hours of deliberation without reaching a verdict, leaving the proceedings stranded in an apparent 11–1 deadlock. Rather than enter the mistrial declaration immediately, the judge granted defense attorney Kevin Reddington an extraordinary window: approximately one hour to file an emergency petition with the state's Supreme Judicial Court to halt the declaration.

Northeastern law professor Daniel Medwed characterized the petition as an “extreme long shot.” An appellate court rarely intervenes in a trial judge’s discretionary handling of a hopelessly deadlocked jury, particularly after eighty-five witnesses and weeks of conflicting medical testimony. When the single justice of the Supreme Judicial Court denied the stay later that afternoon, Judge Sullivan called the jurors back into the courtroom and formally brought the trial to a close.

The public following the trial had spent weeks parsing opposing medical theories. The prosecution argued that Clancy retained the capacity to appreciate the wrongfulness of her actions, pointing to her internet searches and calculated movements. The defense maintained that severe postpartum depression, psychosis, and a volatile regimen of prescribed psychiatric medications rendered her legally not guilty by reason of lack of criminal responsibility. 

Yet the trial did not conclude with the validation of either medical theory. It concluded with a procedural pause.

There is a profound human discomfort in that silence. When a case involves unimaginable loss—the deaths of three young children—our instinct is not merely to seek justice, but to demand moral coherence. We want the courtroom to function as an engine of certainty: to convert an unbearable tragedy into a settled verdict that tells us where accountability ends and pathology begins. A binary outcome offers society the relief of a conclusion.

A mistrial refuses that relief. It leaves those following the proceedings stranded in the exact unresolved tension that the jury endured across seven exhausting days. It does not establish what happened inside a human mind; it records only that twelve citizens, bound by constitutional thresholds, could not find unanimous agreement.

The hour-long scramble for an emergency stay was not an attempt to re-litigate psychiatric evaluations or medication dosages before the appellate bench. It was a procedural maneuver to prevent the slate from being wiped clean. For the defense, a mistrial did not represent relief; it meant the entire harrowing architecture of the trial would have to be rebuilt from the foundation, subjecting the families, the court, and the public to a second trial months or years down the line.

Outside the courtroom, spectators often treat justice as though it were narrative fiction—expecting every tragedy to yield an explanation, every conflict to provide closure, and every courtroom to balance the moral ledger. But the law is not literature. It is an apparatus designed to measure evidence against reasonable doubt, not to resolve our collective grief. When twelve people cannot agree, the system does not force a compromise. It simply stops, forcing us to live with the limits of what human judgment can settle.

### Sources

- [Northeastern Global News — Why the Lindsay Clancy Mistrial Stay Bid is an Extreme Long Shot](https://news.northeastern.edu/2026/09/04/lindsay-clancy-mistrial-stay-bid/)
- [Hindustan Times — Lindsay Clancy Mistrial: What an Emergency Stay Means and Defense Options Explained](https://www.hindustantimes.com/world-news/us-news/lindsay-clancy-mistrial-what-does-an-emergency-stay-mean-kevin-reddingtons-options-explained-101788536264431.html)
- [Wall Street Journal — Opinion: Public Perception and Legal Standards in High-Profile Trials](https://www.wsj.com/articles/lindsay-clancy-isnt-an-everywoman)`;

const summary = 'When thirty-six hours of jury deliberation ends without a verdict, the legal system refuses to provide easy moral certainty. An examination of the Lindsay Clancy mistrial and the limits of institutional closure.';

async function evaluateAndRebuild() {
  console.log('1. Checking Zero AI Slop hard gates (Rules 37-41)...');
  const { validateZeroAISlopEngineBlockers } = await import('../bot-engine/editorial-intelligence-service.js');
  const gateCheck = validateZeroAISlopEngineBlockers({
    title: 'The Long Shot of a Stay',
    content: deepenedEssay,
    category: 'Essays',
    persona: { penName: 'arsh_zee', fullName: 'Arshdeep Singh' }
  });

  if (!gateCheck.isValid) {
    console.error('Hard Gate Violations:', gateCheck.violations);
    process.exit(1);
  }
  console.log('Zero AI Slop Gates: PASSED (0 violations)');

  console.log('\n2. Querying local LM Studio on port 1234...');
  const prompt = `CRITIQUE INSTRUCTION:
You are an expert literary editor evaluating a legal essay against the Zero AI Slop Standard.
Evaluate this essay for:
- Tone and emotional resonance without exploiting tragedy
- Procedural accuracy (7 days deliberation, 36+ hours, 85 witnesses, deadlocked jury, 1-hour emergency stay window to Mass SJC)
- Absence of invented dialogue or speculative interiority
- Philosophical depth regarding public demands for closure vs legal realism

DRAFT:
${deepenedEssay}

Return:
Score: <0-100>/100
VERDICT: APPROVE or REJECT
Craft Commentary`;

  const lmStudioRes = await fetch('http://localhost:1234/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'dirty-muse-writer-v01-uncensored-erotica-nsfw-i1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1024
    })
  });

  if (lmStudioRes.ok) {
    const lmData = await lmStudioRes.json();
    console.log('\n================== LM STUDIO CRITIQUE ==================\n');
    console.log(lmData?.choices?.[0]?.message?.content);
    console.log('\n========================================================\n');
  } else {
    console.warn('LM Studio request returned status:', lmStudioRes.status);
  }

  console.log('3. Persisting deepened essay to PostgreSQL...');
  const res = await pool.query(`
    UPDATE public.posts
    SET content = $1,
        summary = $2,
        updated_at = NOW()
    WHERE id = '105b1991-bb87-4388-aece-9ce60e950bf4'
    RETURNING id, title, category, updated_at;
  `, [deepenedEssay, summary]);

  console.log('PostgreSQL Updated:', res.rows[0]);
  await pool.end();
}

evaluateAndRebuild().catch(console.error);
