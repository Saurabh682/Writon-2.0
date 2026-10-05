import { LinkedInValidatorService } from '../services/linkedin-validator-service.js';

const validator = new LinkedInValidatorService();

const commentary = `AI Made Code Cheap. It Didn't Make Software Cheap.

There is a new software economics problem emerging from AI coding: disposable code is becoming almost free.

Need a migration script? Generate it.
Need to connect two APIs? Generate it.
Need an internal tool nobody plans to maintain? Generate it before lunch.

That is useful—until the “temporary” script is still running nine months later.

Now somebody has to understand it. Debug it. Secure it. Update it. Explain why it exists.

And suddenly the economics look very different.

AI reduces the generation cost of software. It does not automatically reduce its ownership cost.

That distinction may become increasingly important for engineering leaders. Before keeping AI-generated code, perhaps every team needs one question:

If this still exists six months from now, who owns understanding it?

Because code can now be generated almost instantly. Institutional understanding still takes time.

#softwareengineering #technicaldebt #developerexperience #softwarearchitecture #artificialintelligence`;

const evalRes = validator.evaluateGates({
  commentary,
  format: 'TEXT_ONLY',
  ignoreScheduleWindow: true,
  recentPublications: [
    { id: '1', commentary: 'A writer can rank in search', published_at: '2026-09-29T03:24:52.562Z' }
  ]
});

console.log('Quality Gates Evaluation:');
console.log('allPassed:', evalRes.allPassed);
console.log('Passed gates:', evalRes.passedGates, '/', evalRes.totalGates);
if (!evalRes.allPassed) {
  console.log('Failed gates:');
  evalRes.results.filter(r => !r.passed).forEach(r => console.log(' - [' + r.gateCode + ']: ' + r.failureReason));
} else {
  console.log('✅ ALL 20 GATES PASSED (100%)');
}
