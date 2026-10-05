import fs from 'fs';
import path from 'path';

// Read server .env directly
const envPath = path.resolve('server/.env');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
  if (match) apiKey = match[1].trim();
}

if (!apiKey) {
  apiKey = process.env.GEMINI_API_KEY;
}

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set. Please configure it in server/.env or environment variables.');
}

async function evaluateDraft() {
  const model = 'gemini-3.6-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `CRITIQUE INSTRUCTION:
You are an uncompromising literary editor evaluating a prospective essay draft against the WritOn Zero AI Slop Standard.

DRAFT TO EVALUATE:
Title: Four Hours Inside a Foregone Conclusion
Author: Dr. Sunita Banerjee

The result looks simple now: Alexander Zverev, seeded fourth, defeated Quentin Halys in the second round of the US Open. The score occupies one line: 6–4, 4–6, 7–6(3), 6–7(3), 6–3. The match occupied four hours and thirty-three minutes of Arthur Ashe Stadium, ending past 2 a.m.

The brass paperweight on my desk holds down three batches of tutorial assignments from first-year literature students. In the marks ledger beside the stack, one student's name had carried a penciled note since August: "probable B-plus." The student had received a B or B-plus on every assignment across the previous term. It was an administrative forecast. It suggested the student’s thinking would occupy a settled tier before the new submission had even been read.

Watching the fifth set unfold beside my bookshelf, I kept thinking of that forecast.

A tournament seed establishes the hierarchy from which expectations are built. It says nothing about the resistance required to preserve that hierarchy once play begins. It cannot measure the cost of holding an established outcome together under stadium lights after midnight.

Halys struck eighteen aces and dragged the contest into two tiebreaks. Zverev answered with twenty-nine of his own, surviving his second consecutive five-set struggle of the week. The favorite won, but the victory arrived stripped of every illusion of ease.

The hierarchy survived, but it had to be defended for four hours and thirty-three minutes.

I turn back to the student's essay and begin reading the final page again.

CRITIQUE PROTOCOL:
Evaluate this draft against the Zero AI Slop Standard.
- Strict Persona: Dr. Sunita Banerjee (literature teacher in Delhi, lenses of grading, rubrics, expectations vs reality).
- Strict Fact Binding: 2026 US Open Zverev d. Halys on Arthur Ashe Stadium, 6–4, 4–6, 7–6(3), 6–7(3), 6–3, 4h 33m, 29 vs 18 aces, seeded fourth.
- Functional Analogy Parity: Prior tournament seed matches prior marks ledger forecast.
- No Tidy Symbolic Ending: Evaluates continued human reading instead of theatrical gestures.

Provide:
1. Score out of 100 (e.g. Score: 94/100)
2. VERDICT: APPROVE or REJECT
3. Detailed line-by-line craft critique.`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048
    }
  };

  console.log(`Sending evaluation to Google Gemini REST API (${model})...`);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`Gemini API error (${response.status}):`, err);
    return;
  }

  const data = await response.json();
  const critique = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('\n================== LITERARY CRITIQUE RESULT ==================\n');
  console.log(critique);
  console.log('\n==============================================================\n');

  // Synchronize result with bridge server
  const scoreMatch = critique.match(/(?:score|rating)[:\s]*(\d{1,3})\s*\/\s*100/i) || critique.match(/\b(\d{1,3})\s*\/\s*100\b/);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
  const isApproved = /\b(?:VERDICT:\s*APPROVE|APPROVED|PASS)\b/i.test(critique);
  const verdict = isApproved || (score && score >= 85) ? 'APPROVE' : 'REJECT';

  await fetch('http://localhost:3001/api/v1/extension/result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId: 'job_1789679863150_e94a31ae',
      success: true,
      score,
      verdict,
      critique
    })
  });

  console.log(`\nBridge server synchronized: Verdict = ${verdict}, Score = ${score}/100`);
}

evaluateDraft().catch(console.error);
