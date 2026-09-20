import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const calibratedEssay = `### The Long Shot of a Stay

On September 4, inside a Massachusetts courtroom, Judge William Sullivan signaled that he would declare a mistrial in the prosecution of Lindsay Clancy. The jury had concluded seven days and more than thirty-six hours of deliberation without reaching a verdict, leaving the proceedings stranded in an apparent 11–1 deadlock. Rather than enter the mistrial declaration immediately, the judge granted defense attorney Kevin Reddington an extraordinary window: approximately one hour to file an emergency petition with the state's Supreme Judicial Court to halt the declaration.

Northeastern law professor Daniel Medwed characterized the petition as an “extreme long shot.” An appellate court rarely intervenes in a trial judge’s discretionary handling of a hopelessly deadlocked jury, particularly after eighty-five witnesses and weeks of conflicting medical testimony. When the single justice of the Supreme Judicial Court denied the stay later that afternoon, Judge Sullivan called the jurors back into the courtroom and formally brought the trial to a close.

The public following the trial had spent weeks parsing opposing medical theories. The prosecution argued that Clancy retained the capacity to appreciate the wrongfulness of her actions, pointing to her internet searches and calculated movements. The defense maintained that severe postpartum depression, psychosis, and a volatile regimen of prescribed psychiatric medications rendered her legally not guilty by reason of lack of criminal responsibility. 

Yet the trial did not conclude with the validation of either medical theory. It concluded with a procedural pause.

In public commentary, a high-profile criminal trial is often treated as an engine designed to deliver moral certainty. When a case involves unimaginable loss—the deaths of three young children—the collective demand for a definitive verdict becomes almost unbearable. Society asks the court to pronounce either culpability or exoneration, to convert catastrophic tragedy into an unambiguous legal conclusion.

A mistrial refuses that closure. It does not establish what happened inside a defendant's mind; it records only that twelve citizens, instructed under the law, could not agree on an answer. 

The hour-long scramble for an emergency stay was not an attempt to re-litigate psychiatric evaluations or medication dosages before the appellate bench. It was a procedural maneuver to prevent the slate from being wiped clean. For the defense, a mistrial did not represent relief; it meant the entire harrowing architecture of the trial would have to be rebuilt from the foundation, subjecting everyone involved to a second trial months or years down the line.

Outside the courtroom, commentators often demand that legal systems mirror narrative instincts: every conflict must resolve, every mystery must yield a diagnosis, and every trial must settle the moral ledger. But the law is not narrative fiction. It is a procedural apparatus bound by strict constitutional thresholds. When evidence fails to persuade twelve jurors beyond a reasonable doubt, the system does not invent a compromise. It simply stops, acknowledging the limits of what institutional consensus can achieve.

### Sources

- [Northeastern Global News — Why the Lindsay Clancy Mistrial Stay Bid is an Extreme Long Shot](https://news.northeastern.edu/2026/09/04/lindsay-clancy-mistrial-stay-bid/)
- [Hindustan Times — Lindsay Clancy Mistrial: What an Emergency Stay Means and Defense Options Explained](https://www.hindustantimes.com/world-news/us-news/lindsay-clancy-mistrial-what-does-an-emergency-stay-mean-kevin-reddingtons-options-explained-101788536264431.html)
- [Wall Street Journal — Opinion: Public Perception and Legal Standards in High-Profile Trials](https://www.wsj.com/articles/lindsay-clancy-isnt-an-everywoman)`;

const summary = 'When thirty-six hours of jury deliberation ends without a verdict, the legal system does not provide moral certainty. An examination of the Lindsay Clancy mistrial and the procedural limits of institutional judgment.';

async function rebuildPost() {
  const res = await pool.query(`
    UPDATE public.posts
    SET category = 'Essays',
        title = 'The Long Shot of a Stay',
        content = $1,
        summary = $2,
        updated_at = NOW()
    WHERE id = '105b1991-bb87-4388-aece-9ce60e950bf4'
    RETURNING id, title, category, updated_at;
  `, [calibratedEssay, summary]);

  console.log('Successfully rebuilt post in PostgreSQL:', res.rows[0]);
  await pool.end();
}

rebuildPost().catch(console.error);
