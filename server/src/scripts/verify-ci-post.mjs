import { LinkedInValidatorService } from '../services/linkedin-validator-service.js';

const validator = new LinkedInValidatorService();

const commentary = `Generation Scaled. CI Didn't.

AI coding may be creating a new engineering bottleneck that receives far less attention than model capability: the infrastructure behind the developer.

Coding agents can generate changes, tests, and pull requests in minutes.
CI runners still have to execute them.
Staging environments still have to provision.
Integration tests still have to complete.
Deployment pipelines still have finite capacity.

The current trend data around AI engineering is beginning to show exactly this tension: higher synthetic code velocity is pushing CI/CD and staging systems into queues, with some teams reporting extremely long turnaround times and reconsidering how much work should happen locally instead.

This creates an interesting inversion.

For years we optimized:
developer → code

Now we may need to optimize:
code → verification → integration → release

AI hasn't removed the software delivery bottleneck. It has pushed it downstream. And that changes the architecture conversation.

Maybe the next generation of developer infrastructure needs:
• faster local test execution
• smaller, smarter validation paths
• fewer expensive remote round trips
• infrastructure designed for machine-scale change volume
• clearer separation between what must run remotely and what can be proven locally

The important metric may stop being:
How quickly did AI produce the change?

and become:
How quickly can the entire system establish confidence in it?

Generation scaled.
CI didn't.

#ArtificialIntelligence #SoftwareEngineering #DevOps #CICD #DeveloperExperience`;

const evalRes = validator.evaluateGates({
  commentary,
  format: 'TEXT_ONLY',
  ignoreScheduleWindow: true,
  recentPublications: []
});

console.log('Gate Evaluation Result:');
console.log('allPassed:', evalRes.allPassed);
console.log('Passed gates:', evalRes.passedGates, '/', evalRes.totalGates);
if (!evalRes.allPassed) {
  console.log('Failed gates:');
  evalRes.results.filter(r => !r.passed).forEach(r => console.log(' - [' + r.gateCode + ']: ' + r.failureReason));
}
