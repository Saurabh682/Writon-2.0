const fullEssay = `CRITIQUE INSTRUCTION:
You are an uncompromising literary editor evaluating a prospective essay draft against the WritOn Zero AI Slop Standard.

DRAFT TO EVALUATE:
Title: Four Hours Inside a Foregone Conclusion
Author: Dr. Sunita Banerjee

The result looks simple now: Alexander Zverev, seeded third, defeated Quentin Halys in the second round of the US Open. The score occupies one line: 6–4, 4–6, 7–6(3), 6–7(3), 6–3. The match occupied four hours and thirty-three minutes of Arthur Ashe Stadium, ending past 2 a.m.

The brass paperweight on my desk holds down three batches of tutorial assignments from first-year literature students. In the margin of an essay on Rabindranath Tagore's educational pamphlets, I had penciled a provisional grade: B-plus. It was an administrative prediction. It suggested the student’s thinking would occupy a known, comfortable tier—competent, settled, predictable.

Watching the fifth set unfold beside my bookshelf, I kept thinking of those grades.

Rankings and grades share a seductive administrative promise: they persuade us that hierarchy is an established state of being rather than an hourly expenditure of energy. A tournament seed tells you where an athlete is supposed to finish. It says nothing about the physical resistance required to make that expectation come true. It cannot measure the cost of holding a foregone conclusion together under stadium lights after midnight.

Halys struck eighteen aces and dragged the contest into two tiebreaks. Zverev answered with twenty-nine of his own, surviving his second consecutive five-set struggle of the week. The favorite won, but the victory arrived stripped of every illusion of ease.

The drama of the night was not that velocity conquered finesse. It was that hierarchy had to pay full price for its survival.

I shut the monitor. The Delhi humidity outside my window is thick and quiet. I pick up my fountain pen, unthread the cap, and draw a single blue line through the provisional grade on the student's paper.

Evaluate this draft against the Zero AI Slop Standard. Return a score out of 100 and a VERDICT (APPROVE or REJECT) with your craft critique.`;

async function main() {
  const res = await fetch('http://localhost:3001/api/v1/extension/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Four Hours Inside a Foregone Conclusion (Calibrated Full)',
      prompt: fullEssay,
      chatUrl: 'https://chatgpt.com/share/6aac49ee-89d8-83ee-927f-b058cd12117c'
    })
  });
  console.log('Queued calibrated draft:', await res.json());
}

main();
