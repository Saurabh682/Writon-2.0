async function runCerebrasEvaluation() {
  const apiKey = 'csk-2thf28xejd38d5nhhv9y6ne923nnnyc42e5prmm5j28pr9nw';
  const draft = `CRITIQUE INSTRUCTION:
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
Evaluate this draft against the Zero AI Slop Standard. Return:
1. Score out of 100 (e.g. Score: 92/100)
2. VERDICT: APPROVE or REJECT
3. Detailed line-by-line craft critique analyzing persona consistency, factual sports binding, analogy functional parity, and absence of synthetic closure.`;

  console.log('Sending evaluation to Cerebras API (gpt-oss-120b)...');
  const startTime = Date.now();

  const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: 'You are an uncompromising literary critic and editor enforcing the WritOn Zero AI Slop Standard. You reject unearned metaphors, synthetic closure, false precision, and decorative prose. You evaluate with strict intellectual rigor.'
        },
        {
          role: 'user',
          content: draft
        }
      ],
      temperature: 0.2,
      max_tokens: 2048
    })
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`HTTP Status: ${response.status} (completed in ${duration}s)`);

  const data = await response.json();
  if (data.choices && data.choices[0]) {
    const text = data.choices[0].message.content;
    console.log('\n================== CEREBRAS EVALUATION RESULT ==================\n');
    console.log(text);
    console.log('\n=================================================================\n');

    // Post to bridge server
    const scoreMatch = text.match(/(?:score|rating)[:\s]*(\d{1,3})\s*\/\s*100/i) || text.match(/\b(\d{1,3})\s*\/\s*100\b/);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
    const isApproved = /\b(?:VERDICT:\s*APPROVE|APPROVED|PASS)\b/i.test(text);

    await fetch('http://localhost:3001/api/v1/extension/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: 'job_1789679863150_e94a31ae',
        success: true,
        score,
        verdict: isApproved || (score && score >= 85) ? 'APPROVE' : 'REJECT',
        critique: text
      })
    });
    console.log('Result successfully synchronized with bridge server (:3001)!');
  } else {
    console.error('Error response:', JSON.stringify(data, null, 2));
  }
}

runCerebrasEvaluation().catch(console.error);
