export const WRITER_TIPS = [
  { id: 'concrete-opening', title: 'Begin with something the reader can touch', body: 'Before naming the emotion, place one physical detail in the scene: a half-empty tea glass, a damp ticket, a buzzing tube light.' },
  { id: 'dialogue-air', title: 'Give dialogue some air', body: 'On a phone screen, long dialogue blocks become walls. Break exchanges where the speaker, intention, or physical action changes.' },
  { id: 'title-after-draft', title: 'Try naming the piece after the draft exists', body: 'A title often becomes sharper once you know which image, sentence, or contradiction the finished piece actually revolves around.' },
  { id: 'cut-explanation', title: 'Check the sentence after your strongest image', body: 'Writers often explain an image immediately after landing it. Read that next sentence once without it. The scene may already be doing the work.' },
  { id: 'ending-pressure', title: 'Let the ending carry pressure, not a summary', body: 'A final image, choice, or unresolved turn can stay with the reader longer than a paragraph explaining what the story meant.' },
];

function hashString(value) {
  let h = 2166136261;
  for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function selectWriterTip(profileId, isoWeekKey) {
  const index = hashString(`${profileId}:${isoWeekKey}`) % WRITER_TIPS.length;
  return WRITER_TIPS[index];
}
