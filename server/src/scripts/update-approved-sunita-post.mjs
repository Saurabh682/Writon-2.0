import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const approvedContent = `### Four Hours Inside a Foregone Conclusion

The result looks simple now: Alexander Zverev, seeded fourth, defeated Quentin Halys in the second round of the US Open. The score occupies one line: 6–4, 4–6, 7–6(3), 6–7(3), 6–3. The match occupied four hours and thirty-three minutes of Arthur Ashe Stadium, ending past 2 a.m.

The brass paperweight on my desk holds down three batches of tutorial assignments from first-year literature students. In the marks ledger beside the stack, one student's name had carried a penciled note since August: "probable B-plus." The student had received a B or B-plus on every assignment across the previous term. It was an administrative forecast. It suggested the student’s thinking would occupy a settled tier before the new submission had even been read.

Watching the fifth set unfold beside my bookshelf, I kept thinking of that forecast.

A tournament seed establishes the hierarchy from which expectations are built. It says nothing about the resistance required to preserve that hierarchy once play begins. It cannot measure the cost of holding an established outcome together under stadium lights after midnight.

Halys struck eighteen aces and dragged the contest into two tiebreaks. Zverev answered with twenty-nine of his own, surviving his second consecutive five-set struggle of the week. The favorite won, but the victory arrived stripped of every illusion of ease.

The hierarchy survived, but it had to be defended for four hours and thirty-three minutes.

I turn back to the student's essay and begin reading the final page again.

### Sources

- [US Open — Alexander Zverev Wins Another 2026 US Open Five-Set Marathon Against Quentin Halys](https://www.usopen.org/en_US/news/articles/2026-09-04/alexander_zverev_wins_another_2026_us_open_five-set_marathon.html)
- [Tennis.com — Match Statistics: Alexander Zverev vs Quentin Halys, Round 2](https://www.tennis.com/tournaments/us-open/matches/a-zverev-vs-q-halys-2026-09-04)
- [Sports Illustrated — Alexander Zverev vs Quentin Halys Prediction and Betting Odds, US Open Second Round](https://www.si.com/betting/alexander-zverev-vs-quentin-halys-prediction-odds-for-us-open-second-round)`;

const approvedSummary = 'On paper, Alexander Zverev vs Quentin Halys at the US Open was a predictable second-round fixture. Four hours and thirty-three minutes later, hierarchy had survived, but it had to be defended every minute.';

async function updateDatabase() {
  const res = await pool.query(`
    UPDATE public.posts
    SET content = $1,
        summary = $2,
        updated_at = NOW()
    WHERE id = 'a6e1d2d7-65e7-46f0-84e0-39e9eb5de9d2'
    RETURNING id, title, updated_at;
  `, [approvedContent, approvedSummary]);

  console.log('Updated post in PostgreSQL:', res.rows[0]);
  await pool.end();
}

updateDatabase().catch(console.error);
