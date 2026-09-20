import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const calibratedTitle = 'When a River Has to Wait';
const calibratedSummary = 'Near Darchula, a landslide in the gorge forced the Chaulani River to halt for an afternoon. In Fort Kochi, a poet watches tidal water leave and return on schedule, observing the difference between water that flows predictably and mountain hydrology stopped in its tracks.';
const calibratedContent = `### I

At four in the afternoon, the tide in the Vembanad estuary does what it has done all week: it pulls three inches of salt water away from the seawall, exposing the barnacles on the wooden pilings, then stops. Twenty minutes later, it turns back toward the harbor. You can set a pocket watch by the mud.

Then the notification arrives from the far north: near the border at Darchula, the slope above Bhattar sheared away. Shale and dry silt dropped into the gorge of the Chaulani River.

The wire report does not describe a flood. It describes the opposite: the water simply ceased to arrive.

### II

A mountain river does not know how to be still. From the Api Himal, it drops eight thousand feet over boulder beds and slate shelves, loud enough that two people standing on the footbridge must shout into each other's collars.

When the ridge slid, the sound must have vanished first.

The district administration ordered ten families uphill from the bank. The police post at Api Himal radioed downstream to warn people away from the dry gravel of the riverbed, because dry riverbeds in September do not stay dry.

For three hours, the impoundment grew behind fifty feet of loose shale. A river that had never paused since the snowmelt began was forced to sit in the gorge and fill a bowl of rubble.

### III

Here on the coast, we expect water to leave.
The tide goes out because the moon pulls it;
the sandbars dry, the gulls wait on the stakes,
and by five o’clock the gray swell fills the inlet again.

Up there, water that stops moving is an emergency.
You do not stare at a still pool in a gorge
wondering what it means for your soul.
You stand on the higher terrace with your shoes on,
watching whether the crest of the rubble is darkening with moisture,
waiting for the weight behind it to punch through.

### IV

By nightfall, the district office reported that the Chaulani had cut its own channel through the silt. The flow downstream normalized. The relocated families stayed on the upper slope overnight because the cliff face above the cut was still shedding loose shale into the dark.

The tide here in Kochi is coming back against the stone now, right on time, lifting the hulls of the moored skiffs an inch every ten minutes. It is strange to live beside water whose return is a certainty, reading about a river six hundred miles away that had to wait an entire afternoon just to resume falling.

---

#poetry #darchula #hydrology #rivers #geography #kerala`;

const res = await client.query(`
  UPDATE public.posts
  SET title = $1,
      summary = $2,
      content = $3,
      content_updated_at = now()
  WHERE id = 'ce0dea6a-b4a0-457e-a9bd-dc30800027bb'
  RETURNING id, title, slug;
`, [calibratedTitle, calibratedSummary, calibratedContent]);

console.log('[UPDATED POST]', res.rows);
await client.end();
