import { LinkedInValidatorService } from '../services/linkedin-validator-service.js';

const validator = new LinkedInValidatorService();

const commentary = `A writer can rank in search and still never gain a reader.

The trend data around AI search for fiction authors highlights a critical shift: once someone discovers your story, what gives them a reason to return?

A search result can introduce the work. But discovery only buys a first impression.

A memorable character, a consistent publishing rhythm, and a place to continue the conversation can build the relationship.

For fiction writers, the practical test is simple: after someone finishes one piece, is their next step clear?

What has brought readers back to your writing?

#FictionWriting #IndieAuthors #WritingCommunity #Storytelling #WritOn`;

const evalRes = validator.evaluateGates({
  commentary,
  format: 'SINGLE_IMAGE',
  mediaAssets: [{ id: 'writer_search_reader_hook.png' }],
  ignoreScheduleWindow: true,
  recentPublications: []
});

console.log('Quality Gates Evaluation:');
console.log('All passed:', evalRes.allPassed);
console.log('Passed:', evalRes.passedGates, '/', evalRes.totalGates);
if (!evalRes.allPassed) {
  evalRes.results.filter(r => !r.passed).forEach(r => console.log(' - [' + r.gateCode + ']: ' + r.failureReason));
} else {
  console.log('✅ ALL 20 GATES PASSED (100%)');
}
