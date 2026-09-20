async function enqueue() {
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

Evaluate this draft against the Zero AI Slop Standard. Return a score out of 100 and a VERDICT (APPROVE or REJECT) with your craft critique.`;

  const res = await fetch('http://localhost:3001/api/v1/extension/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      title: 'Four Hours Inside a Foregone Conclusion (Iteration 3 - High Calibrated)',
      type: 'chatgpt_evaluate',
      chatUrl: 'https://chatgpt.com/share/6aac49ee-89d8-83ee-927f-b058cd12117c'
    })
  });
  const data = await res.json();
  console.log('Enqueue Response:', data);
}

enqueue().catch(console.error);
