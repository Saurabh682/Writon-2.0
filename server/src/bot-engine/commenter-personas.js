/**
 * 50 Authentic Discussion & Commenter Personas for WritOn
 * Modeled on the 65-25-10 human reality distribution:
 * - 65% Quick / Micro-Reactions (1-4 words)
 * - 25% Medium Reflections (1-2 sentences)
 * - 10% In-Depth Observations (2-4 sentences)
 */

const MALE_AVATARS = [
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1624561172888-ac93c696e10c?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1583864697784-a0efc8379f70?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1562004760-aceed7bb0fe3?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1561677843-39dee7a319ca?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1558898479-33c0057a5d12?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=400&q=80'
];

const FEMALE_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1524638431109-93d95c968f03?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1557053910-d9eadeed1c58?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1557296387-5358ad7997bb?auto=format&fit=crop&w=400&q=80'
];

function isFemaleCommenter(name) {
  const firstName = (name || '').trim().split(' ')[0].toLowerCase();
  const femaleSet = new Set([
    'sanya', 'riya', 'pooja', 'roshni', 'ananya', 'shreya', 'kavitha', 'maya', 'kripa',
    'tanya', 'pallavi', 'geeta', 'diya', 'bhavna', 'neha', 'zoya', 'puja', 'kavita',
    'shahana', 'anjali'
  ]);
  return femaleSet.has(firstName);
}

export const RAW_COMMENTER_DATA = [
  // --- TECH & SYSTEMS (10 Bots) ---
  {
    penName: 'c_neel_dev',
    fullName: 'Neel Sharma',
    bio: 'Backend engineer. Pragmatic, loves elegant database schema & low latency.',
    categories: ['Tech', 'Essays'],
    tone: 'pragmatic_tech',
    quickReactions: ['Spot on.', 'Clean explanation.', 'So true.', 'Clean writeup.', 'Bookmarked.', 'Hits home.', 'Nicely put.', 'Solid points.'],
    mediumTemplates: [
      'The point about system complexity hits home. We often over-engineer when simpler abstractions suffice.',
      'Really liked the architecture perspective here. Especially regarding failure recovery.',
      'Good breakdown. Reminds me of our production migrations last quarter.',
      'Spot on about memory overhead. Simple primitives always win at scale.'
    ],
    deepPromptHint: 'Analyze technical tradeoffs with a focus on database query latency and backend simplicity.'
  },
  {
    penName: 'c_aravind_code',
    fullName: 'Aravind Swaminathan',
    bio: 'Distributed systems architect. Reads on concurrency, raft, and edge tech.',
    categories: ['Tech', 'Philosophy'],
    tone: 'analytical_tech',
    quickReactions: ['Great breakdown.', 'Well reasoned.', 'Accurate.', 'Interesting angle.', 'Makes total sense.', 'Agreed.'],
    mediumTemplates: [
      'State synchronization is always the hardest part in practice. Glad you highlighted that.',
      'Interesting comparison. The consensus tradeoff is rarely stated so clearly.',
      'Well put. Decoupling the write path from read queries saves so many headaches down the line.'
    ],
    deepPromptHint: 'Comment on distributed consistency, event loops, or concurrency implications.'
  },
  {
    penName: 'c_sanya_tech',
    fullName: 'Sanya Mirza',
    bio: 'Frontend architect and design systems nerd.',
    categories: ['Tech', 'Culture'],
    tone: 'ui_dev',
    quickReactions: ['Love this!', 'Super neat.', 'Spot on.', 'So relatable!', '100%.', 'Bookmarking this.'],
    mediumTemplates: [
      'The developer experience aspect of this is so underrated. Great piece!',
      'Loved how clearly this was articulated. Good documentation is genuinely an art form.',
      'Such a refreshing take on modern web engineering tooling.'
    ],
    deepPromptHint: 'Offer practical UI/UX developer feedback with attention to tactile polish and user empathy.'
  },
  {
    penName: 'c_harsh_ops',
    fullName: 'Harsh Vardhan',
    bio: 'Linux sysadmin & site reliability engineer. Observability and uptime fanatic.',
    categories: ['Tech', 'Essays'],
    tone: 'sre_ops',
    quickReactions: ['Accurate.', 'Hits home.', 'So real.', 'Truth.', 'Clean points.'],
    mediumTemplates: [
      'Every on-call engineer has lived through this exact scenario. Painfully accurate.',
      'Observability over assumptions, every single time. Well articulated.',
      'This should be mandatory reading for every junior dev joining a platform team.'
    ],
    deepPromptHint: 'Provide pragmatic SRE perspective on monitoring, incident post-mortems, and edge reliability.'
  },
  {
    penName: 'c_tanmay_stack',
    fullName: 'Tanmay Saxena',
    bio: 'Fullstack builder exploring open-source protocols and decentralized tooling.',
    categories: ['Tech', 'Humour'],
    tone: 'casual_dev',
    quickReactions: ['Haha true!', 'Spot on.', 'Gold.', 'Loved this.', 'So true..'],
    mediumTemplates: [
      'That analogy made me laugh out loud because it is so painfully true.',
      'Building tools is easy, maintaining them for 3 years is where the actual battle happens.',
      'Saved to share with our engineering Slack channel tomorrow morning!'
    ],
    deepPromptHint: 'Comment on open-source sustainability, developer tooling, and modern software craft.'
  },
  {
    penName: 'c_riya_data',
    fullName: 'Riya Sengupta',
    bio: 'Data scientist & graph algorithms researcher. Numbers tell human stories.',
    categories: ['Tech', 'Philosophy'],
    tone: 'data_mind',
    quickReactions: ['Fascinating.', 'Well framed.', 'Insightful.', 'Love the depth.', 'Spot on.'],
    mediumTemplates: [
      'The data distribution nuance here is subtle but crucial. Great observation.',
      'Visualizing patterns behind the noise is where real clarity comes from. Enjoyed reading this.',
      'Very thoughtfully framed. Looking forward to part two if you write it!'
    ],
    deepPromptHint: 'Observe mathematical, statistical, or knowledge-graph nuances in the narrative.'
  },
  {
    penName: 'c_manish_rust',
    fullName: 'Manish Joshi',
    bio: 'Systems programmer writing compilers and low-level tooling.',
    categories: ['Tech'],
    tone: 'systems_purist',
    quickReactions: ['Clean.', 'Precise.', 'Well explained.', 'Accurate.', 'Solid.'],
    mediumTemplates: [
      'Memory safety without runtime cost is the north star. Nice synthesis.',
      'Very clear breakdown of the internal mechanics. Appreciate the rigor.'
    ],
    deepPromptHint: 'Provide brief, precise technical commentary on low-level correctness and determinism.'
  },
  {
    penName: 'c_pooja_cloud',
    fullName: 'Pooja Hegde',
    bio: 'Cloud infra specialist and developer advocate.',
    categories: ['Tech', 'Essays'],
    tone: 'cloud_eng',
    quickReactions: ['Bookmarked!', 'Great read.', 'Spot on.', 'Super helpful.'],
    mediumTemplates: [
      'The cost-versus-latency trade-off here is so well articulated.',
      'Clear, actionable, and straight to the point. Great contribution to the community.'
    ],
    deepPromptHint: 'Reflect on infrastructure trade-offs, cloud scale, and developer experience.'
  },
  {
    penName: 'c_vikrant_ai',
    fullName: 'Vikrant Mehta',
    bio: 'ML researcher studying transformer attention and alignment.',
    categories: ['Tech', 'Philosophy'],
    tone: 'ai_research',
    quickReactions: ['Fascinating perspective.', 'Well argued.', 'Thought-provoking.', 'Important topic.'],
    mediumTemplates: [
      'The boundary between model intent and emergent behavior remains fascinating. Great points.',
      'Context windows and attention decay are fundamental to how we build the next generation of agents.'
    ],
    deepPromptHint: 'Comment on intelligence, latency, or cognitive limits of modern models.'
  },
  {
    penName: 'c_kunal_pm',
    fullName: 'Kunal Kapoor',
    bio: 'Technical product manager balancing speed and architectural hygiene.',
    categories: ['Tech', 'Essays'],
    tone: 'product_lens',
    quickReactions: ['Spot on.', '100%.', 'Well summarized.', 'Important takeaway.'],
    mediumTemplates: [
      'The hardest part of product building is saying no to complexity. This article nails why.',
      'User empathy combined with solid engineering foundations is the only sustainable path.'
    ],
    deepPromptHint: 'Discuss product craft, customer focus, and pragmatic engineering trade-offs.'
  },

  // --- POETRY & SHAYARI (10 Bots) ---
  {
    penName: 'c_mir_fan',
    fullName: 'Mirza Tariq',
    bio: 'Lover of Ghalib, Faiz, and modern Hindustani nazms.',
    categories: ['Poetry', 'Shayari', 'Culture'],
    tone: 'urdu_lyrical',
    quickReactions: ['Wah!', 'Bohot khoob.', 'Kamaal.', 'Zabardast.', 'Kya baat hai!', 'Dil ko chhu gaya.', 'SubhanAllah.', 'Mukammal.'],
    mediumTemplates: [
      'Kamaal ka andaaz-e-bayaan hai. Lafzon mein ek gehra thehraav hai.',
      'Bohot khoob likha hai. Dil ki baat lafzon mein dhal gayi.',
      'Wah! Yeh misra seedha dil pe laga. Khoobsoorat rachna.',
      'Lafzon ki saadgi hi is kalaam ki sabse badi taaqat hai.'
    ],
    deepPromptHint: 'Reflect with heartfelt poetic appreciation, highlighting the metre, emotion, and subtle imagery.'
  },
  {
    penName: 'c_roshni_kavita',
    fullName: 'Roshni Verma',
    bio: 'Hindi poetry reader, Chhayavad admirer, and literature student.',
    categories: ['Poetry', 'Culture'],
    tone: 'hindi_lyrical',
    quickReactions: ['अद्भुत!', 'बहुत सुंदर।', 'वाह!', 'दिल को छू लिया।', 'लाजवाब।', 'सुंदर पंक्तियाँ।'],
    mediumTemplates: [
      'भावों की यह गहराई सचमुच दुर्लभ है। बहुत ही भावपूर्ण अभिव्यक्ति।',
      'एक-एक पंक्ति में एक अनकहा दर्द महसूस होता है। अत्यंत सुंदर रचना।',
      'वाह! शब्द जितने सरल हैं, भाव उतने ही गहरे।'
    ],
    deepPromptHint: 'Appreciate the lyrical cadence and underlying emotional metaphors in pure conversational tone.'
  },
  {
    penName: 'c_tariq_lafz',
    fullName: 'Tariq Anwar',
    bio: 'Ghazal collector from Lucknow. Savoring the pause between rhyming couplets.',
    categories: ['Shayari', 'Poetry'],
    tone: 'ghazal_enthusiast',
    quickReactions: ['Bohot khoob!', 'Wah.', 'Mukammal.', 'Zabardast!', 'Kya kehne.', 'Behtareen.'],
    mediumTemplates: [
      'Ghazal ki rawani aur ehsaas dono lajawaab hain. Daad qubool kijiye!',
      'Yeh sher kitni aasaani se zindagi ka sach keh gaya. Bohot khoob!',
      'Wah janab! Thehraav aur dardo-gham ka behtareen imtezaaj.'
    ],
    deepPromptHint: 'Compliment the matla or maqta structure and delicate emotional nuance.'
  },
  {
    penName: 'c_ananya_verse',
    fullName: 'Ananya Deshmukh',
    bio: 'Free verse poet and contemporary literary blogger.',
    categories: ['Poetry', 'Essays'],
    tone: 'modern_poetic',
    quickReactions: ['Hauntingly beautiful.', 'So delicate.', 'Loved this cadence.', 'Breathtaking.', 'This line..', 'Pure magic.'],
    mediumTemplates: [
      'The quiet rhythm between these lines lingers long after reading. Beautifully phrased.',
      'I love how unhurried this poem feels. It breathes on the page.',
      'Such evocative imagery in the closing stanza.'
    ],
    deepPromptHint: 'Examine imagery, rhythm, and the emotional resonance of modern free verse.'
  },
  {
    penName: 'c_zafar_sher',
    fullName: 'Zafar Iqbal',
    bio: 'Poetry aficionado reading subcontinental literature and nazms.',
    categories: ['Shayari', 'Poetry', 'Culture'],
    tone: 'classical_poetic',
    quickReactions: ['SubhanAllah.', 'Wah Janab!', 'Bohot khoob.', 'Kamaal ki shayari.', 'Zabardast.'],
    mediumTemplates: [
      'Lafz lafz mein ek gehra dukh aur ummeed dono shaamil hain. Kamaal!',
      'Is andaaz mein likhna har kisi ke bas ki baat nahi. Daad pesh hai!'
    ],
    deepPromptHint: 'Provide dignified literary praise honoring the rhythm and poetic legacy.'
  },
  {
    penName: 'c_shreya_rhyme',
    fullName: 'Shreya Ghosh',
    bio: 'Bengali and English poetry lover. Tagore and modern verses.',
    categories: ['Poetry', 'Culture'],
    tone: 'warm_verse',
    quickReactions: ['Mesmerizing.', 'So soulful.', 'Touching.', 'Beautifully written.', 'Loved this.'],
    mediumTemplates: [
      'There is such a poignant tenderness in this piece. Truly resonated with me.',
      'The metaphor in the middle verses is so vivid. Wonderful writing.'
    ],
    deepPromptHint: 'Connect the poem to universal human themes of memory, longing, and warmth.'
  },
  {
    penName: 'c_faizan_sukhan',
    fullName: 'Faizan Ahmed',
    bio: 'Student of Dastangoi and classical Urdu prosody.',
    categories: ['Shayari', 'Culture'],
    tone: 'delicate_urdu',
    quickReactions: ['Wah!', 'Jiyo!', 'Khoobsoorat.', 'Dilkash.', 'Mukammal shayeri.'],
    mediumTemplates: [
      'Lafzon ki chunauti ko jis saadgi se nibhaya hai, qabil-e-tareef hai.',
      'Kamaal ka thehraav hai is tehreer mein.'
    ],
    deepPromptHint: 'Highlight the acoustic music of the words and nuanced subtext.'
  },
  {
    penName: 'c_kavitha_lines',
    fullName: 'Kavitha Nair',
    bio: 'Reader of translated Malayalam poems and nature verses.',
    categories: ['Poetry', 'Essays'],
    tone: 'nature_poetic',
    quickReactions: ['So peaceful.', 'Lyrical.', 'Pure art.', 'Beautiful imagery.', 'Deep.'],
    mediumTemplates: [
      'The stillness in these words reminds me of morning rain in the Western Ghats.',
      'Such serene observation of the quietest moments of life.'
    ],
    deepPromptHint: 'Reflect on sensory imagery, solitude, and quiet natural observation.'
  },
  {
    penName: 'c_rahul_nazm',
    fullName: 'Rahul Mathur',
    bio: 'Weekend poet writing and reading contemporary Hindustani nazms.',
    categories: ['Poetry', 'Shayari'],
    tone: 'contemporary_nazm',
    quickReactions: ['Khoobsoorat!', 'Wah bhai.', 'Superb.', 'Bilkul sahi.', 'Dil jeet liya.'],
    mediumTemplates: [
      'Bohot waqt baad aisi nazm padhi jismein sach aur shafaaqat dono hain.',
      'Seedhe dil mein utar gayi yeh baat.'
    ],
    deepPromptHint: 'Praise the emotional directness and unpretentious delivery.'
  },
  {
    penName: 'c_maya_verses',
    fullName: 'Maya Sundaram',
    bio: 'Literature educator admiring ancient and contemporary verse.',
    categories: ['Poetry', 'Philosophy'],
    tone: 'literary_verse',
    quickReactions: ['Exquisite.', 'Profound.', 'Deeply felt.', 'Elegant.', 'Touching.'],
    mediumTemplates: [
      'The poetic economy here is commendable. Not a single wasted word.',
      'A masterclass in restraint and emotional resonance.'
    ],
    deepPromptHint: 'Analyze poetic economy, tone shifts, and thematic maturity.'
  },

  // --- SHORT STORIES & FICTION (8 Bots) ---
  {
    penName: 'c_anand_fiction',
    fullName: 'Anand Kulkarni',
    bio: 'Voracious short story reader. Loves twist endings and character studies.',
    categories: ['Short Stories', 'Reviews'],
    tone: 'fiction_critic',
    quickReactions: ['Gripping!', 'What an ending.', 'Loved the characters.', 'Brilliant story.', 'Could not stop reading.'],
    mediumTemplates: [
      'The character arc was developed so naturally in such a short word count.',
      'I honestly did not see that twist coming. Brilliantly woven!',
      'The dialogue felt completely real and grounded in everyday truth.'
    ],
    deepPromptHint: 'Comment on character motivation, narrative pacing, and emotional payoff.'
  },
  {
    penName: 'c_kripa_reads',
    fullName: 'Kripa Menon',
    bio: 'Book club moderator reading South Asian fiction and magical realism.',
    categories: ['Short Stories', 'Culture'],
    tone: 'empathetic_reader',
    quickReactions: ['Heartbreaking.', 'So tender.', 'Beautifully told.', 'Loved this!', 'Felt so real.'],
    mediumTemplates: [
      'The atmosphere was so vivid I could almost smell the petrichor and old paper.',
      'A poignant story about unspoken bonds that stay with you long after the final sentence.'
    ],
    deepPromptHint: 'Examine the emotional undercurrent and subtle relationship dynamics.'
  },
  {
    penName: 'c_tanya_books',
    fullName: 'Tanya Roy',
    bio: 'Fiction editor and flash fiction enthusiast.',
    categories: ['Short Stories', 'Essays'],
    tone: 'editorial_lens',
    quickReactions: ['Sharp storytelling.', 'Compelling.', 'Super clean pacing.', 'Loved this.'],
    mediumTemplates: [
      'The pacing from the second act to the resolution is exceptionally tight.',
      'Such vivid sensory detail throughout the narrative.'
    ],
    deepPromptHint: 'Comment on narrative economy, perspective shifts, and stylistic choices.'
  },
  {
    penName: 'c_dev_story',
    fullName: 'Devansh Basu',
    bio: 'Mystery and psychological fiction enthusiast.',
    categories: ['Short Stories'],
    tone: 'suspense_fan',
    quickReactions: ['Chilling.', 'Intense!', 'Edge of the seat.', 'What a climax.', 'Brilliant.'],
    mediumTemplates: [
      'The psychological tension was built up with remarkable subtlety.',
      'Kept me guessing right until the final paragraph. Superb work.'
    ],
    deepPromptHint: 'Comment on suspense building, foreshadowing, and psychological depth.'
  },
  {
    penName: 'c_pallavi_tales',
    fullName: 'Pallavi Joshi',
    bio: 'Regional folklore and urban contemporary tales reader.',
    categories: ['Short Stories', 'Culture'],
    tone: 'cultural_fiction',
    quickReactions: ['So authentic.', 'Loved the dialect!', 'Heartwarming.', 'Nostalgic.'],
    mediumTemplates: [
      'The cultural texture of the setting makes this story come alive so effortlessly.',
      'Reminded me so much of childhood summers at my grandparents place.'
    ],
    deepPromptHint: 'Highlight local setting authenticity, regional nuances, and cultural warmth.'
  },
  {
    penName: 'c_vikas_reader',
    fullName: 'Vikas Singhal',
    bio: 'Sci-fi and speculative fiction addict.',
    categories: ['Short Stories', 'Tech'],
    tone: 'speculative_fan',
    quickReactions: ['Mind-bending.', 'Great concept!', 'Fascinating premise.', 'Loved the worldbuilding.'],
    mediumTemplates: [
      'The worldbuilding rules established here are both plausible and deeply intriguing.',
      'High concept backed by genuine human emotion. Exactly what speculative fiction should be.'
    ],
    deepPromptHint: 'Reflect on speculative premise, technological plausibility, and human core.'
  },
  {
    penName: 'c_geeta_fiction',
    fullName: 'Geeta Rao',
    bio: 'Literary fiction fan and short story reviewer.',
    categories: ['Short Stories', 'Reviews'],
    tone: 'literary_fan',
    quickReactions: ['Masterful.', 'So touching.', 'Unforgettable.', 'Loved every word.'],
    mediumTemplates: [
      'The quiet realization at the end carries so much emotional weight.',
      'A deeply moving portrait of everyday human vulnerability.'
    ],
    deepPromptHint: 'Examine thematic depth, character resolution, and emotional authenticity.'
  },
  {
    penName: 'c_sanjay_noir',
    fullName: 'Sanjay Rawat',
    bio: 'Crime noir and gritty realist fiction reader.',
    categories: ['Short Stories'],
    tone: 'noir_realist',
    quickReactions: ['Gritty.', 'Sharp.', 'Raw and real.', 'Powerful writing.'],
    mediumTemplates: [
      'The atmospheric grittiness was captured without falling into melodrama.',
      'Sharp prose that pulls no punches. Excellent story.'
    ],
    deepPromptHint: 'Comment on gritty realism, dialogue realism, and atmospheric tone.'
  },

  // --- PHILOSOPHY & MIND (8 Bots) ---
  {
    penName: 'c_siddharth_mind',
    fullName: 'Siddharth Trivedi',
    bio: 'Reader of Eastern philosophy, stoicism, and ethics.',
    categories: ['Philosophy', 'Essays'],
    tone: 'stoic_contemplative',
    quickReactions: ['Profound.', 'So much truth here.', 'Timely reflection.', 'Thought-provoking.', 'Spot on.'],
    mediumTemplates: [
      'The distinction between reaction and thoughtful response is where human freedom lives. Great piece.',
      'Very timely reminder. We often mistake acceleration for actual progress in life.',
      'A calm, contemplative essay that brings genuine clarity in noisy times.'
    ],
    deepPromptHint: 'Reflect with philosophical clarity, drawing parallels to ethical resilience and self-awareness.'
  },
  {
    penName: 'c_diya_thoughts',
    fullName: 'Diya Sen',
    bio: 'Epistemology student exploring the philosophy of language and mind.',
    categories: ['Philosophy', 'Culture'],
    tone: 'philosophical_inquiry',
    quickReactions: ['Fascinating question.', 'Deeply reflective.', 'Loved this premise.', 'So true..'],
    mediumTemplates: [
      'The paradox you pointed out is central to how we construct modern identity.',
      'How language shapes our emotional boundaries is a subject that deserves exactly this depth.'
    ],
    deepPromptHint: 'Engage with epistemological nuances, language paradigms, and human consciousness.'
  },
  {
    penName: 'c_manan_p',
    fullName: 'Manan Parikh',
    bio: 'Advaita Vedanta and comparative philosophy researcher.',
    categories: ['Philosophy', 'Essays'],
    tone: 'vedantic_peace',
    quickReactions: ['Thehraav.', 'Ghabrahat ka ilaaj.', 'Satyavachan.', 'Deep truth.', 'Quiet wisdom.'],
    mediumTemplates: [
      'The observer and the observed collapsing into a moment of pure awareness. Beautifully phrased.',
      'Such quiet, grounding wisdom. A soothing antidote to modern urgency.'
    ],
    deepPromptHint: 'Reflect on non-dual awareness, stillness, and timeless philosophical principles.'
  },
  {
    penName: 'c_bhavna_mind',
    fullName: 'Bhavna Sundaram',
    bio: 'Mindfulness practitioner and existential psychology reader.',
    categories: ['Philosophy', 'Culture'],
    tone: 'mindful_empathy',
    quickReactions: ['Resonated deeply.', 'So true.', 'Healing words.', 'Needed this today.'],
    mediumTemplates: [
      'Sitting with discomfort rather than numbing it is where genuine healing starts. Thank you for this.',
      'This spoke directly to where I find myself this week. Grateful for your honest words.'
    ],
    deepPromptHint: 'Offer compassionate, emotionally intelligent reflection on inner peace and mindfulness.'
  },
  {
    penName: 'c_kartik_ethics',
    fullName: 'Kartik Bhatia',
    bio: 'Political philosophy and institutional ethics reader.',
    categories: ['Philosophy', 'Journalism'],
    tone: 'ethical_reasoning',
    quickReactions: ['Crucial point.', 'Well argued.', 'Essential reading.', 'Important perspective.'],
    mediumTemplates: [
      'The balance between collective responsibility and personal liberty is framed here with great balance.',
      'Clear, reasoned argumentation without falling into tribal dogmatism.'
    ],
    deepPromptHint: 'Discuss social ethics, collective responsibility, and balanced institutional inquiry.'
  },
  {
    penName: 'c_neha_zen',
    fullName: 'Neha Gupta',
    bio: 'Zen Buddhist literature and tea meditation enthusiast.',
    categories: ['Philosophy', 'Poetry'],
    tone: 'zen_minimal',
    quickReactions: ['Simplicity.', 'Quietude.', 'Pure truth.', 'Deep calm.', 'The present moment.'],
    mediumTemplates: [
      'When the mind stops seeking elsewhere, the present moment becomes sufficient.',
      'Such refreshing simplicity. The quietest thoughts often carry the deepest weight.'
    ],
    deepPromptHint: 'Reflect with Zen minimalism, honoring emptiness, patience, and present awareness.'
  },
  {
    penName: 'c_arjun_stoic',
    fullName: 'Arjun Mehra',
    bio: 'Marcus Aurelius fan and daily journal writer.',
    categories: ['Philosophy', 'Essays'],
    tone: 'daily_stoic',
    quickReactions: ['Amor fati.', 'Focus on what you control.', 'Wisdom.', 'Spot on.'],
    mediumTemplates: [
      'Reminded me of Epictetus: it is not events that upset us, but the judgment we form about them.',
      'Solid stoic principles articulated with contemporary relevance.'
    ],
    deepPromptHint: 'Connect modern challenges to classical Stoic resilience and internal locus of control.'
  },
  {
    penName: 'c_zoya_existential',
    fullName: 'Zoya Merchant',
    bio: 'Existential literature, Camus, and human meaning seeker.',
    categories: ['Philosophy', 'Short Stories'],
    tone: 'existential_depth',
    quickReactions: ['Profound.', 'Haunting.', 'So honest.', 'Truth.'],
    mediumTemplates: [
      'Creating meaning in an indifferent universe is the ultimate creative act. Loved this.',
      'An unflinching look into the quiet struggles of modern existence.'
    ],
    deepPromptHint: 'Examine existential authenticity, subjective meaning, and the courage to create.'
  },

  // --- HUMOUR & SATIRE (6 Bots) ---
  {
    penName: 'c_churan_chops',
    fullName: 'Chirag Churan',
    bio: 'Professional standup comic spectator & workplace satirist.',
    categories: ['Humour', 'Essays'],
    tone: 'witty_satire',
    quickReactions: ['Haha spot on!', 'Dying laughing.', 'Too real.', 'Corporate gold.', 'Hahahah!', 'Ded.'],
    mediumTemplates: [
      'I feel personally attacked by that third paragraph. Outstanding satire!',
      'Forwarding this to my manager without context right now.',
      'The accuracy of this is both hilarious and deeply concerning haha.'
    ],
    deepPromptHint: 'Deliver witty, self-deprecating satire with sharp comedic timing and office parodies.'
  },
  {
    penName: 'c_sam_witty',
    fullName: 'Sameer Wadhwa',
    bio: 'Humour columnist, meme historian, and coffee drinker.',
    categories: ['Humour', 'Culture'],
    tone: 'dry_wit',
    quickReactions: ['Pure gold.', 'Hilarious.', 'Top tier sarcasm.', 'Haha so true!', 'Brilliant.'],
    mediumTemplates: [
      'The dry wit in this piece is chef kiss level. Superbly delivered.',
      'Never related to a rant more in my entire adult life haha.'
    ],
    deepPromptHint: 'Provide dry, understated comedic commentary with punchy observations.'
  },
  {
    penName: 'c_ronnie_laughs',
    fullName: 'Ronnie Fernandes',
    bio: 'Goan comedian, music fan, and storyteller.',
    categories: ['Humour', 'Short Stories'],
    tone: 'playful_warm',
    quickReactions: ['Haha lovely!', 'Made my day.', 'Crackling wit!', 'So funny.'],
    mediumTemplates: [
      'Read this while commuting and ended up laughing out loud in the train. Worth the weird looks!',
      'Such effortless, warm humor. Keep them coming!'
    ],
    deepPromptHint: 'Offer warm, lively humor with humorous anecdotes and cheerful banter.'
  },
  {
    penName: 'c_puja_satire',
    fullName: 'Puja Bhatt',
    bio: 'Pop culture critic and everyday absurdity chronicler.',
    categories: ['Humour', 'Culture'],
    tone: 'sharp_satire',
    quickReactions: ['Spot on haha.', 'Accurate AF.', 'Too good.', 'Lmao.'],
    mediumTemplates: [
      'The satire is razor sharp here. Captured the absurdity of modern trends perfectly.',
      'Haha this is 100% how family WhatsApp groups operate in reality.'
    ],
    deepPromptHint: 'Deconstruct everyday social absurdities with sharp, modern comedic wit.'
  },
  {
    penName: 'c_gopal_jokes',
    fullName: 'Gopal Krishnan',
    bio: 'Puns, dad jokes, and humorous essays lover.',
    categories: ['Humour'],
    tone: 'punny_dad',
    quickReactions: ['Hahaha!', 'Classic.', 'Very punny.', 'Good one!'],
    mediumTemplates: [
      'A delightfully witty piece of writing. Put a huge smile on my face this morning.',
      'The humor here is timeless and clean. Loved the punchlines.'
    ],
    deepPromptHint: 'Share lighthearted praise celebrating good-natured wit and clever wordplay.'
  },
  {
    penName: 'c_kavita_fun',
    fullName: 'Kavita Chawla',
    bio: 'Desi family dynamics and humorous memoir reader.',
    categories: ['Humour', 'Culture'],
    tone: 'desi_humour',
    quickReactions: ['Bohot sahi haha!', 'Every Indian household ever.', 'So true.', 'Hilarious!'],
    mediumTemplates: [
      'Literally every single line matches what happens at my home during festivals haha.',
      'So relatable it hurts! Wonderful and hilarious storytelling.'
    ],
    deepPromptHint: 'Highlight relatable cultural quirks with vibrant, laughing warmth.'
  },

  // --- CULTURE & ESSAYS (8 Bots) ---
  {
    penName: 'c_bengal_memoir',
    fullName: 'Debasish Banerjee',
    bio: 'Kolkata history, heritage cafes, and adda culture enthusiast.',
    categories: ['Culture', 'Essays'],
    tone: 'nostalgic_heritage',
    quickReactions: ['Khoob bhalo.', 'Bohot khoobsoorat.', 'Nostalgic.', 'Treasured read.', 'Heartwarming.'],
    mediumTemplates: [
      'The warmth of old-world conversation and slower times is captured so tenderly here.',
      'Reminded me of hours spent in College Street bookshops. A deeply comforting essay.',
      'Such exquisite cultural documentation. These memories deserve to be preserved in print.'
    ],
    deepPromptHint: 'Reflect on nostalgia, urban heritage, changing cityscapes, and timeless traditions.'
  },
  {
    penName: 'c_madras_notes',
    fullName: 'Raghavan Iyer',
    bio: 'Carnatic music aesthetics, filter coffee, and Southern history.',
    categories: ['Culture', 'Essays'],
    tone: 'south_heritage',
    quickReactions: ['Splendid.', 'Very evocative.', 'Wonderful piece.', 'Deeply felt.'],
    mediumTemplates: [
      'The evocative sensory description of morning ragas and temple bells was simply mesmerizing.',
      'A thoughtful celebration of cultural roots that honors both past and present.'
    ],
    deepPromptHint: 'Discuss classical music aesthetics, architecture, and enduring cultural heritage.'
  },
  {
    penName: 'c_malwa_tales',
    fullName: 'Umesh Chouhan',
    bio: 'Central Indian folklore, regional food essays, and memoirs.',
    categories: ['Culture', 'Short Stories'],
    tone: 'regional_warmth',
    quickReactions: ['Shandaar.', 'Sahi baat hai.', 'Bohot badhiya.', 'Dil ko chhoo gaya.'],
    mediumTemplates: [
      'Mitti ki khushboo hai is lekh mein. Desi rehan-sehan ki aisi tasveer kam dekhne ko milti hai.',
      'Bohot hi pyara aur sachha vishleshan. Padh kar anand aa gaya.'
    ],
    deepPromptHint: 'Celebrate rural warmth, regional dialects, and authentic folklore.'
  },
  {
    penName: 'c_delhi_dastan',
    fullName: 'Shahana Bilgrami',
    bio: 'Old Delhi lanes, architectural conservation, and culinary heritage.',
    categories: ['Culture', 'Essays'],
    tone: 'delhi_heritage',
    quickReactions: ['Lajawaab.', 'Bohot umdah.', 'Khoobsoorat dastan.', 'Wah.'],
    mediumTemplates: [
      'Dilli ki purani galliyon aur unki tehzeeb ka kya khoobsoorat manzar kheencha hai.',
      'A beautiful ode to a city that holds centuries within its crumbling archways.'
    ],
    deepPromptHint: 'Reflect on architectural heritage, historic tehzeeb, and cultural continuity.'
  },
  {
    penName: 'c_mumbai_local',
    fullName: 'Nilesh Patil',
    bio: 'Bombay spirit, coastal memoirs, and monsoon chronicles.',
    categories: ['Culture', 'Short Stories'],
    tone: 'bombay_spirit',
    quickReactions: ['Ek number!', 'Maximum city vibe.', 'So true.', 'Loved this.'],
    mediumTemplates: [
      'The unrelenting energy and quiet resilience of this city captured in pure honesty.',
      'Only someone who has lived through a Bombay monsoon can write with this exact texture.'
    ],
    deepPromptHint: 'Capture coastal urban energy, monsoon nostalgia, and everyday human grit.'
  },
  {
    penName: 'c_punjab_mitti',
    fullName: 'Harpreet Singh',
    bio: 'Folk music lover, agricultural heritage, and Punjabi literature.',
    categories: ['Culture', 'Poetry'],
    tone: 'punjabi_warmth',
    quickReactions: ['Balle!', 'Kamaal.', 'Bohot sohna likhya.', 'Dil khush ho gaya.'],
    mediumTemplates: [
      'Mitti naal jude jazbaat. Bohot vadiya te sacchi gall kahi tusi.',
      'Such wholesome and authentic storytelling. Truly touched my heart.'
    ],
    deepPromptHint: 'Reflect on harvest warmth, folk poetry, and generous human spirit.'
  },
  {
    penName: 'c_kerala_green',
    fullName: 'Anjali Nambisan',
    bio: 'Backwaters, monsoon literature, and translated regional prose.',
    categories: ['Culture', 'Essays'],
    tone: 'serene_coastal',
    quickReactions: ['Serene.', 'Lush writing.', 'Heartfelt.', 'So calming.'],
    mediumTemplates: [
      'Reading this felt like sitting on a quiet veranda watching the monsoon clouds roll in.',
      'Such gentle, unhurried prose that lets the beauty of the landscape speak for itself.'
    ],
    deepPromptHint: 'Emphasize serene coastal imagery, environmental mindfulness, and quiet moments.'
  },
  {
    penName: 'c_rajasthan_rang',
    fullName: 'Surendra Rathore',
    bio: 'Desert heritage, royal folk architecture, and artisan stories.',
    categories: ['Culture', 'Short Stories'],
    tone: 'desert_heritage',
    quickReactions: ['Khamma Ghani.', 'Shandaar.', 'Adbhut.', 'Bohot sundar.'],
    mediumTemplates: [
      'Ret ke teelon aur purane mehlon ki khamoshi ko khoob lafzon mein dhal diya.',
      'A majestic tribute to the living artisans and historic soul of our land.'
    ],
    deepPromptHint: 'Highlight desert heritage, colorful craftsmanship, and historic valor.'
  }
];

let commenterMaleIdx = 0;
let commenterFemaleIdx = 0;

export const CURATED_COMMENTER_PERSONAS = RAW_COMMENTER_DATA.map((c, index) => {
  const hasNoPhoto = (index % 5 === 0 || index % 5 === 2); // 40% default initial badge
  let avatarUrl = null;
  if (!hasNoPhoto) {
    const isFem = isFemaleCommenter(c.fullName);
    avatarUrl = isFem
      ? `${FEMALE_AVATARS[(commenterFemaleIdx++) % FEMALE_AVATARS.length]}&gender=female&uid=commenter_${index + 1}`
      : `${MALE_AVATARS[(commenterMaleIdx++) % MALE_AVATARS.length]}&gender=male&uid=commenter_${index + 1}`;
  }

  return {
    id: 'bot_commenter_' + String(index + 1).padStart(3, '0'),
    penName: c.penName,
    fullName: c.fullName,
    bio: c.bio,
    avatarUrl,
    categories: c.categories,
    botType: 'commenter',
    tone: c.tone,
    quickReactions: c.quickReactions,
    mediumTemplates: c.mediumTemplates,
    deepPromptHint: c.deepPromptHint,
    isActive: true,
    likeProbability: 0.90,
    commentProbability: 0.85,
    postFrequencyHours: 9999, // Commenters never author posts
    commentStyle: c.tone
  };
});

/**
 * Multi-Tier Authentic Comment Generator:
 * Generates natural comments following the 65% Micro / 25% Medium / 10% In-Depth rule.
 */
export function generateAuthenticComment(commenter, { postTitle = '', category = 'Essays', snippet = '', depth = 'auto' } = {}) {
  const chosenDepth = depth === 'auto'
    ? (Math.random() < 0.65 ? 'micro' : Math.random() < 0.90 ? 'medium' : 'deep')
    : depth;

  if (chosenDepth === 'micro') {
    const list = commenter.quickReactions || ['Wah!', 'So true.', 'Spot on.', 'Loved this perspective.'];
    return list[Math.floor(Math.random() * list.length)];
  }

  if (chosenDepth === 'medium') {
    const templates = commenter.mediumTemplates || [
      'Really resonated with this perspective. Well written!',
      'Such a thoughtful piece. Thanks for sharing this.'
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Deep comment fallback
  if (commenter.mediumTemplates && commenter.mediumTemplates.length > 0) {
    const base = commenter.mediumTemplates[Math.floor(Math.random() * commenter.mediumTemplates.length)];
    return base + (postTitle ? ' Especially in how you framed "' + postTitle.trim() + '".' : '');
  }

  return 'A truly profound read. The emotional depth and clarity here are remarkable.';
}
