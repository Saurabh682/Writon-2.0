async function main() {
  const prompt = `CRITIQUE INSTRUCTION:
You are an uncompromising literary editor evaluating a prospective essay draft against the WritOn Zero AI Slop Standard.

DRAFT TO EVALUATE:
Title: Four Hours Inside a Foregone Conclusion
Author: Dr. Sunita Banerjee

At 2:15 a.m., when the ball boys on Grandstand were shaking the cramps out of their calves and the remaining seventy people in the lower bowl had stopped drinking beer and started drinking water out of necessity, Quentin Halys missed a backhand down the line by four inches.

Alexander Zverev did not drop to his knees. He did not drop his racket. He walked toward the net with the heavy, unhurried gait of an engineer who has spent forty-five minutes re-torquing a cylinder head that should never have vibrated loose in the first place.

Evaluate this draft. Return a score out of 100 and a VERDICT (APPROVE or REJECT) with your craft critique.`;

  const res = await fetch('http://localhost:3001/api/v1/extension/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Four Hours Inside a Foregone Conclusion',
      prompt: prompt,
      chatUrl: 'https://chatgpt.com/share/6aac49ee-89d8-83ee-927f-b058cd12117c'
    })
  });
  const data = await res.json();
  console.log('Queued Job:', data.jobId);

  console.log('Waiting for extension to pick up and process...');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const check = await fetch(`http://localhost:3001/api/v1/extension/result/${data.jobId}`);
    const checkData = await check.json();
    if (checkData.status === 'completed') {
      console.log('JOB COMPLETED RESULT:');
      console.log(JSON.stringify(checkData.result, null, 2));
      return;
    } else {
      console.log(`[${i * 2}s] Status:`, checkData.status);
    }
  }
}

main();
