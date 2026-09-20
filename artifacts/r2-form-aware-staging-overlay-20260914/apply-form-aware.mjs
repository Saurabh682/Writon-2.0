import { readFileSync, writeFileSync } from 'node:fs';

const serverPath = '/app/src/server.js';
const previous = 'greatest(30, p.reading_time_min * 30)';
const replacement = `(case
                    when p.word_count > 0 and p.content_form = 'poetry'
                      then greatest(8, ceil(p.word_count * 60.0 / 200.0))
                    when p.word_count > 0 and p.content_form = 'flash'
                      then greatest(20, ceil(p.word_count * 60.0 / 200.0))
                    when p.word_count > 0 and p.content_form = 'essay'
                      then greatest(45, ceil(p.word_count * 60.0 / 200.0))
                    else greatest(30, p.reading_time_min * 30)
                  end)`;
const source = readFileSync(serverPath, 'utf8');
const occurrences = source.split(previous).length - 1;
if (occurrences !== 2) {
  throw new Error(`Expected exactly two reading-time guards; found ${occurrences}.`);
}
writeFileSync(serverPath, source.replaceAll(previous, replacement));
