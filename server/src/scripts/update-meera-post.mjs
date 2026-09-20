import dotenv from 'dotenv';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TARGET_POST_ID = '63ee21e8-b86f-456c-a0df-c860d4633e7e';
const NEW_TITLE = 'What the Clapping Cannot Measure';
const NEW_SUMMARY = 'On the Venice standing ovation for Robert Pattinson in Primetime, and the persistent gap between the duration of applause and the inner reality of performance.';

const CALIBRATED_ESSAY = `When the premiere of *Primetime* concluded at the Venice Film Festival, the stopwatch began.

The festival dispatches reported a standing ovation lasting seven minutes—reports ranged from roughly seven to nine minutes. In festival journalism, the duration of applause functions as an immediate, quasi-objective index of artistic triumph. It is recorded with the precision of a sprint: minutes and seconds logged to demonstrate that a hall full of evening clothes and international critics remained on their feet, beating their palms together in unison.

The film stars Robert Pattinson in a dramatized portrayal of *To Catch a Predator* host Chris Hansen, tracking online predators through calculated confrontation. In conversations surrounding the festival, Pattinson noted the peculiar temporal distortion of his recent working year: after the birth of his child, he remarked to *The Guardian* that he felt as though he had "twice as much time," managing a compressed schedule of high-stakes productions while domestic boundaries forced him to stay home.

That phrase catches my attention because performance culture is obsessed with measuring time from the outside.

A standing ovation gives an audience a measurable metric: seven minutes. Reviews offer adjectives; box office ledgers record transactions; streaming platforms measure completion percentages down to the second. A dance critic can describe rhythmic precision, tempo, phrasing, and whether movement resolves cleanly into the cycle.

Yet the metric always arrives after the performance has already evaporated.

The seven minutes in Venice did not measure Pattinson’s acting while it was occurring inside the frame. The acting existed within the shot—in the vocal restraint, the calibrated stillness of the gaze, what the film presents as the moral ambiguity of turning a crusade for justice into television spectacle. The seven minutes belonged entirely to the room afterward: a collective social release, an institutional ritual where an audience converts its private attention into public noise.

This conversion always leaves a gap. We can measure how long an auditorium claps. We cannot use that number to recover what the work cost the performer, or what any individual spectator experienced while watching. In any disciplined performance tradition—whether an actor confronting a camera or an audience watching an intricate solo recital—the work finishes in the body long before the crowd decides when to sit back down.

The dispatch can tell us that Venice stood for seven minutes. It cannot tell us where the performance went when the lights came up.

---

#culture #filmcriticism #performance #venicefilmfestival #cinematicarts #audiencerituals

#writon`;

async function run() {
  try {
    console.log(`Checking post ${TARGET_POST_ID}...`);
    const res = await pool.query('SELECT id, title, content FROM public.posts WHERE id = $1', [TARGET_POST_ID]);
    if (res.rows.length === 0) {
      console.error('Post not found in database!');
      return;
    }

    console.log(`Found post "${res.rows[0].title}". Updating to "${NEW_TITLE}"...`);
    await pool.query(
      `UPDATE public.posts 
       SET title = $1, 
           summary = $2,
           content = $3, 
           updated_at = NOW() 
       WHERE id = $4`,
      [NEW_TITLE, NEW_SUMMARY, CALIBRATED_ESSAY, TARGET_POST_ID]
    );

    const verify = await pool.query('SELECT id, title, summary, updated_at FROM public.posts WHERE id = $1', [TARGET_POST_ID]);
    console.log('Successfully updated post:', verify.rows[0]);
  } catch (err) {
    console.error('Error updating post in DB:', err);
  } finally {
    await pool.end();
  }
}

run();
