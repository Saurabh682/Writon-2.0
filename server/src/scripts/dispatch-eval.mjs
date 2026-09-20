const promptText = `CRITIQUE INSTRUCTION:
You are an uncompromising literary editor evaluating a prospective essay draft against the WritOn Zero AI Slop Standard.

DRAFT TO EVALUATE:
Title: Four Hours Inside a Foregone Conclusion
Author: Dr. Sunita Banerjee

At 2:15 a.m., when the ball boys on Grandstand were shaking the cramps out of their calves and the remaining seventy people in the lower bowl had stopped drinking beer and started drinking water out of necessity, Quentin Halys missed a backhand down the line by four inches.

Alexander Zverev did not drop to his knees. He did not drop his racket. He walked toward the net with the heavy, unhurried gait of an engineer who has spent forty-five minutes re-torquing a cylinder head that should never have vibrated loose in the first place.

Evaluate this draft. Return a score out of 100 and a VERDICT (APPROVE or REJECT) with your craft critique.`;

async function main() {
  const res = await fetch('http://localhost:3001/api/v1/extension/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Four Hours Inside a Foregone Conclusion',
      prompt: promptText,
      chatUrl: 'https://chatgpt.com/share/6aac49ee-89d8-83ee-927f-b058cd12117c'
    })
  });
  const data = await res.json();
  console.log('Dispatched draft to bridge queue:', data);
}

main();
