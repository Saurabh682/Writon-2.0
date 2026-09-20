async function evaluateWithUserKey() {
  const key = 'AQ.Ab8RN6LRc9_WBlDANsf6HPOoWorOs4fcGFRdUPBjkNXhue3zzg';

  const prompt = `You are an uncompromising literary editor evaluating a prospective essay draft against the WritOn Zero AI Slop Standard.
Zero AI Slop mandates:
1. Grounded factual precision (Arthur Ashe Stadium, official scores 6–4, 4–6, 7–6(3), 6–7(3), 6–3, 4h 33m duration, 29 Zverev aces vs 18 Halys aces, 4th seed).
2. Persona integrity (Dr. Sunita Banerjee teaches literature in Delhi; her authentic lens is pedagogy, tutorial assignments, rubrics, and marks ledgers—NEVER mechanical engine or engineering metaphors).
3. Analogy functional parity (A tournament seed is an a priori hierarchy establishing expectation; it must match a prior semester GPA or marks ledger forecast, NOT a provisional grade evaluated after reading).
4. No synthetic closure (The narrator must NOT perform a tidy theatrical action like crossing out a grade to prove a philosophical point; prefer renewed attention or reading the evidence again).

Return:
Score: <0-100>/100
VERDICT: <APPROVE or REJECT>
<Detailed craft critique>

DRAFT TO EVALUATE:
Title: Four Hours Inside a Foregone Conclusion
Author: Dr. Sunita Banerjee

The result looks simple now: Alexander Zverev, seeded fourth, defeated Quentin Halys in the second round of the US Open. The score occupies one line: 6–4, 4–6, 7–6(3), 6–7(3), 6–3. The match occupied four hours and thirty-three minutes of Arthur Ashe Stadium, ending past 2 a.m.

The brass paperweight on my desk holds down three batches of tutorial assignments from first-year literature students. In the marks ledger beside the stack, one student's name had carried a penciled note since August: "probable B-plus." The student had received a B or B-plus on every assignment across the previous term. It was an administrative forecast. It suggested the student’s thinking would occupy a settled tier before the new submission had even been read.

Watching the fifth set unfold beside my bookshelf, I kept thinking of that forecast.

A tournament seed establishes the hierarchy from which expectations are built. It says nothing about the resistance required to preserve that hierarchy once play begins. It cannot measure the cost of holding an established outcome together under stadium lights after midnight.

Halys struck eighteen aces and dragged the contest into two tiebreaks. Zverev answered with twenty-nine of his own, surviving his second consecutive five-set struggle of the week. The favorite won, but the victory arrived stripped of every illusion of ease.

The hierarchy survived, but it had to be defended for four hours and thirty-three minutes.

I turn back to the student's essay and begin reading the final page again.`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`;

  console.log('Evaluating with your new Gemini API key...');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    })
  });

  const data = await res.json();
  console.log('\n================ OUTPUT FROM YOUR NEW API KEY ================\n');
  console.log(data.candidates[0].content.parts[0].text);
  console.log('\n==============================================================\n');
}

evaluateWithUserKey().catch(console.error);
