const SERVER_URL = 'http://localhost:3001/api/v1/extension';
let isRunning = false;

// Set toolbar badge color to terracotta (#D45226)
chrome.action.setBadgeBackgroundColor({ color: '#D45226' });

console.log('[WritOn Bridge SW] Service worker initialized. Autonomous loop starting...');

// In-page submit function
function inPageSubmit(promptText) {
  const inputEl = document.querySelector('#prompt-textarea') || 
                  document.querySelector('div[contenteditable="true"]') ||
                  document.querySelector('textarea');

  if (!inputEl) {
    return { error: 'Could not find ChatGPT input box on page.' };
  }

  inputEl.focus();

  if (inputEl.tagName === 'TEXTAREA') {
    inputEl.value = promptText;
  } else {
    inputEl.innerHTML = '<p>' + promptText.replace(/\n/g, '<br>') + '</p>';
  }

  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  inputEl.dispatchEvent(new Event('change', { bubbles: true }));

  setTimeout(() => {
    const sendBtn = document.querySelector('button[data-testid="send-button"]') ||
                    document.querySelector('button[aria-label="Send prompt"]') ||
                    document.querySelector('button[aria-label="Send message"]');

    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      inputEl.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      }));
    }
  }, 400);

  return { success: true };
}

// In-page extract function
function inPageExtract() {
  const stopBtn = document.querySelector('button[data-testid="stop-button"], button[aria-label="Stop streaming"], button[aria-label="Stop generating"]');
  if (stopBtn) {
    return { streaming: true };
  }

  const containers = Array.from(document.querySelectorAll(
    'div[data-message-author-role="assistant"], div.agent-turn, [data-testid^="conversation-turn-"], article'
  ));

  let extractedText = '';
  if (containers.length > 0) {
    for (let i = containers.length - 1; i >= 0; i--) {
      const el = containers[i];
      const md = el.querySelector('.markdown') || el;
      const text = (md.innerText || md.textContent || '').trim();
      if (text.length > 30) {
        extractedText = text;
        break;
      }
    }
  }

  if (!extractedText) {
    const mdList = document.querySelectorAll('.markdown');
    if (mdList.length > 0) {
      const last = mdList[mdList.length - 1];
      extractedText = (last.innerText || last.textContent || '').trim();
    }
  }

  if (extractedText && extractedText.length > 30) {
    return { completed: true, text: extractedText };
  }

  return { streaming: true };
}

function parseCritique(text) {
  const scoreMatch = text.match(/(?:score|rating)[:\s]*(\d{1,3})\s*\/\s*100/i) ||
                     text.match(/\b(\d{1,3})\s*\/\s*100\b/);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

  const isApproved = /\b(?:VERDICT:\s*APPROVE|APPROVED|PASS)\b/i.test(text);
  const isRejected = /\b(?:VERDICT:\s*REJECT|REJECTED|FAIL|FAILS\s+THE\s+ZERO\s+AI\s+SLOP)\b/i.test(text);

  let verdict = 'REJECT';
  if (isApproved && !isRejected) verdict = 'APPROVE';
  else if (isRejected) verdict = 'REJECT';
  else if (score !== null && score >= 80) verdict = 'APPROVE';

  return { score, verdict, critique: text };
}

async function findChatGptTab() {
  const tabs = await chrome.tabs.query({ url: '*://chatgpt.com/*' });
  return tabs && tabs.length > 0 ? tabs[0] : null;
}

// Autonomous background loop
async function pollAndExecute() {
  if (isRunning) return;

  try {
    const res = await fetch(SERVER_URL + '/poll');
    if (!res.ok) return;

    const { job } = await res.json();
    if (!job) {
      chrome.action.setBadgeText({ text: 'ON' });
      return;
    }

    isRunning = true;
    chrome.action.setBadgeText({ text: 'BUSY' });
    console.log('[WritOn Bridge SW] Claimed job:', job.id);

    let tab = await findChatGptTab();
    if (!tab) {
      console.log('[WritOn Bridge SW] Opening ChatGPT critique thread in background tab...');
      tab = await chrome.tabs.create({
        url: job.chatUrl || 'https://chatgpt.com/share/6aac49ee-89d8-83ee-927f-b058cd12117c',
        active: false
      });
      // Wait 8 seconds for page hydration
      await new Promise(r => setTimeout(r, 8000));
    }

    // Submit prompt
    console.log('[WritOn Bridge SW] Injecting prompt into tab:', tab.id);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: inPageSubmit,
      args: [job.prompt]
    });

    // Monitor for completion
    let checks = 0;
    const maxChecks = 120; // 4 minutes
    let completed = false;

    while (checks < maxChecks && !completed) {
      await new Promise(r => setTimeout(r, 2000));
      checks++;

      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: inPageExtract
        });

        if (result && result.completed) {
          completed = true;
          const parsed = parseCritique(result.text);
          console.log('[WritOn Bridge SW] Evaluation complete! Score:', parsed.score, 'Verdict:', parsed.verdict);

          await fetch(SERVER_URL + '/result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId: job.id,
              success: true,
              score: parsed.score,
              verdict: parsed.verdict,
              critique: parsed.critique
            })
          });

          chrome.action.setBadgeText({ text: parsed.verdict === 'APPROVE' ? 'PASS' : 'REJ' });
          console.log('[WritOn Bridge SW] Result posted to server for job:', job.id);
        }
      } catch (err) {
        console.warn('[WritOn Bridge SW] Polling tab error:', err.message);
      }
    }

    if (!completed) {
      console.error('[WritOn Bridge SW] Timed out waiting for ChatGPT response.');
      chrome.action.setBadgeText({ text: 'ERR' });
    }

  } catch (err) {
    console.error('[WritOn Bridge SW] Poll error:', err);
  } finally {
    isRunning = false;
  }
}

// Check every 5 seconds
setInterval(pollAndExecute, 5000);
pollAndExecute();
