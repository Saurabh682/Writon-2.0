import { execSync } from 'child_process';

const output = execSync('powershell "Get-CimInstance Win32_Process -Filter \\"name = \'chrome.exe\'\\" | Select-Object -ExpandProperty CommandLine"').toString();
const hasDebug = output.includes('9222');
console.log('Is 9222 in command lines?', hasDebug);
if (!hasDebug) {
  console.log('First 200 chars of command lines:\n', output.slice(0, 300));
}
