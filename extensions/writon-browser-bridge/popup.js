const SERVER_URL = 'http://localhost:3001/api/v1/extension';

const dot = document.getElementById('dot');
const serverStatus = document.getElementById('serverStatus');
const queueText = document.getElementById('queueText');
const runBtn = document.getElementById('runBtn');
const openTabBtn = document.getElementById('openTabBtn');
const logBox = document.getElementById('logBox');

function log(msg) {
  logBox.style.display = 'block';
  logBox.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg + '\n' + logBox.textContent;
}

// 1. Get active foreground tab (the exact copy-basket pattern)
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// 2. Poll server status
async function refreshStatus() {
  try {
    const res = await fetch(SERVER_URL + '/status');
    if (res.ok) {
      const data = await res.json();
      dot.className = 'status-dot active';
      serverStatus.textContent = 'Server Connected (:3001)';
      queueText.textContent = 'Pending Queue: ' + data.queueLength + ' | Completed: ' + data.completedJobs;
      return data;
    } else {
      dot.className = 'status-dot error';
      serverStatus.textContent = 'Server Error (' + res.status + ')';
    }
  } catch (e) {
    dot.className = 'status-dot error';
    serverStatus.textContent = 'Server Offline (Start server)';
    queueText.textContent = 'Waiting for localhost:3001...';
  }
  return null;
}

// 3. In-page functions executed on active tab via chrome.scripting.executeScript
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

function inPageExtract() {
  const stopBtn = document.querySelector('button[data-testid="stop-button"], button[aria-label="Stop streaming"], button[aria-label="Stop generating"]');
  if (stopBtn) {
    return { streaming: true };
  }

  // Find all assistant turn containers
  const containers = Array.from(document.querySelectorAll(
    'div[data-message-author-role="assistant"], div.agent-turn, [data-testid^="conversation-turn-"], article'
  ));

  let extractedText = '';
  if (containers.length > 0) {
    // Search backwards for the last element with markdown or text content
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

  // Fallback: look for all .markdown elements on the page
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

// 4. Trigger evaluation on click
runBtn.addEventListener('click', async () => {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    log('No active tab found.');
    return;
  }

  if (!tab.url || !tab.url.includes('chatgpt.com')) {
    log('Active tab is not chatgpt.com. Please switch to your ChatGPT tab.');
    return;
  }

  runBtn.disabled = true;
  runBtn.textContent = 'Fetching draft...';

  try {
    const pollRes = await fetch(SERVER_URL + '/poll');
    const { job } = await pollRes.json();

    if (!job) {
      log('Queue is empty. No drafts waiting for critique.');
      runBtn.disabled = false;
      runBtn.textContent = 'Run Critique on Active Tab';
      refreshStatus();
      return;
    }

    chrome.storage.local.set({ lastJobId: job.id });
    log('Submitting draft ' + job.id + ' into ChatGPT...');
    runBtn.textContent = 'Submitting prompt...';

    const [{ result: submitRes }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: inPageSubmit,
      args: [job.prompt]
    });

    if (submitRes && submitRes.error) {
      log('Page Error: ' + submitRes.error);
      runBtn.disabled = false;
      runBtn.textContent = 'Run Critique on Active Tab';
      return;
    }

    log('Prompt submitted! Waiting for critique response...');
    runBtn.textContent = 'Critique Generating...';

    // Wait and extract
    let checks = 0;
    const timer = setInterval(async () => {
      checks++;
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: inPageExtract
        });

        if (result && result.completed) {
          clearInterval(timer);
          const parsed = parseCritique(result.text);
          log('COMPLETED: ' + parsed.verdict + ' (Score: ' + (parsed.score ?? 'N/A') + '/100)');

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

          log('Result saved to server!');
          runBtn.disabled = false;
          runBtn.textContent = 'Run Critique on Active Tab';
          refreshStatus();
        } else if (checks > 90) {
          clearInterval(timer);
          log('Timed out waiting for response.');
          runBtn.disabled = false;
          runBtn.textContent = 'Run Critique on Active Tab';
        }
      } catch (err) {
        clearInterval(timer);
        log('Error reading tab: ' + err.message);
        runBtn.disabled = false;
        runBtn.textContent = 'Run Critique on Active Tab';
      }
    }, 2000);

  } catch (err) {
    log('Error: ' + err.message);
    runBtn.disabled = false;
    runBtn.textContent = 'Run Critique on Active Tab';
  }
});

const extractBtn = document.getElementById('extractBtn');

extractBtn.addEventListener('click', async () => {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    log('No active tab found.');
    return;
  }

  extractBtn.disabled = true;
  extractBtn.textContent = 'Extracting...';

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: inPageExtract
    });

    if (result && result.text) {
      const parsed = parseCritique(result.text);
      log('Extracted successfully! Verdict: ' + parsed.verdict + ' (Score: ' + (parsed.score ?? 'N/A') + '/100)');

      const stored = await chrome.storage.local.get(['lastJobId']);
      const currentJobId = stored.lastJobId || 'job_1789679863150_e94a31ae';

      // Post to server with the active job ID
      await fetch(SERVER_URL + '/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJobId,
          success: true,
          score: parsed.score,
          verdict: parsed.verdict,
          critique: parsed.critique
        })
      });

      log('Result sent to server (:3001)!');
      refreshStatus();
    } else {
      log('Could not extract text. Is ChatGPT still generating?');
    }
  } catch (err) {
    log('Extract Error: ' + err.message);
  } finally {
    extractBtn.disabled = false;
    extractBtn.textContent = 'Extract Current Output';
  }
});

openTabBtn.addEventListener('click', () => {
  chrome.tabs.create({
    url: 'https://chatgpt.com/share/6aac49ee-89d8-83ee-927f-b058cd12117c'
  });
});

refreshStatus();
setInterval(refreshStatus, 3000);
