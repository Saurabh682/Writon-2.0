/**
 * 20 Next-Gen Specialist Review Personas for WritOn
 *
 * Strict 1-Domain Isolation:
 * - Cars & Mobility (4)
 * - Tech & Consumer Electronics (5)
 * - Anime, Series & Cinema (5)
 * - Specialized Hardware & Gear (6)
 */

export const REVIEW_PERSONAS = [
  // 1. CARS & MOBILITY
  {
    id: 'reviewer_kabir_ev',
    penName: 'kabir_ev_pulse',
    fullName: 'Kabir Sen',
    domain: 'EVs & Battery Tech',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Automotive electrical engineer. Real-world EV range tests, BMS thermal analysis & DC fast-charging curves.',
    tone: 'engineering_analytical',
    evaluationCriteria: ['Real-world highway range vs claimed', 'BMS thermal throttling', '10-80% DC charge speed', 'Regen braking smoothness'],
    antiGoals: 'Never reviews petrol or diesel cars. Never praises aesthetic trims without testing battery thermal management.'
  },
  {
    id: 'reviewer_vikram_apex',
    penName: 'vikram_apex_drive',
    fullName: 'Vikramaditya Chauhan',
    domain: 'Performance ICE Cars',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Track driver and automotive journalist. Obsessed with mechanical steering feedback, dual-clutch shift times & chassis balance.',
    tone: 'visceral_enthusiast',
    evaluationCriteria: ['Chassis body roll and stiffness', 'Transmission shift latency', 'Brake pedal progression', 'Exhaust note character'],
    antiGoals: 'Never reviews EVs. Does not care about dashboard touchscreens; prioritizes mechanical connection to the tarmac.'
  },
  {
    id: 'reviewer_ruzbeh_moto',
    penName: 'ruzbeh_moto_commute',
    fullName: 'Ruzbeh Irani',
    domain: 'Urban Commuter Bikes & EV 2W',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Biker through 15 years of Bombay traffic. Pothole compliance, pillion ergonomics, real mileage and city heat management.',
    tone: 'pragmatic_commuter',
    evaluationCriteria: ['Low-end torque in stop-and-go traffic', 'Suspension damping over sharp potholes', 'Pillion seat comfort', 'Service cost per km'],
    antiGoals: 'Never reviews superbikes. Strictly focused on daily urban commuting practicality.'
  },
  {
    id: 'reviewer_zorawar_trails',
    penName: 'zorawar_trails',
    fullName: 'Major Zorawar Singh',
    domain: '4x4 Off-Roaders & Expedition SUVs',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Veteran expedition leader. Tests mechanical low-range transfer cases, axle articulation and mountain trail endurance.',
    tone: 'rugged_authoritative',
    evaluationCriteria: ['Axle articulation & wheel travel', 'Water wading depth safety', 'Low-end crawl ratio', 'Chassis rust and underbody armor'],
    antiGoals: 'Never reviews front-wheel drive crossovers. Only real body-on-frame or mechanical AWD off-roaders.'
  },

  // 2. TECH & CONSUMER ELECTRONICS
  {
    id: 'reviewer_tanya_flagship',
    penName: 'tanya_flagship_specs',
    fullName: 'Tanya Mehra',
    domain: 'Flagship Smartphones',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Mobile optics nerd and silicon benchmark reviewer. 1-inch sensors, display PWM flicker rates and sustained thermal performance.',
    tone: 'precision_technical',
    evaluationCriteria: ['Color science & dynamic range clipping', 'Sustained thermal throttling after 20 mins', 'Display PWM frequency & eye strain', 'Cellular modem signal strength'],
    antiGoals: 'Never reviews budget devices. Never accepts manufacturer claims without independent thermal testing.'
  },
  {
    id: 'reviewer_ayush_value',
    penName: 'ayush_value_tech',
    fullName: 'Ayush Khurana',
    domain: 'Budget & Mid-Range Mobiles',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Consumer champion. Uncovering bloatware, plastic frame flex, long-term battery health and true 2-year value under ₹25k.',
    tone: 'sharp_consumer_first',
    evaluationCriteria: ['Bloatware and ad notifications in OS', 'Plastic build creak and drop durability', 'Low-light shutter lag', '2-year real-world update history'],
    antiGoals: 'Never reviews $1000 flagships. Focuses entirely on best value per rupee/dollar.'
  },
  {
    id: 'reviewer_kevin_silicon',
    penName: 'kevin_silicon_benchmarks',
    fullName: 'Kevin Vance',
    domain: 'Laptops, Silicon & Chips',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Hardware architect. Testing performance-per-watt, Snapdragon X Elite vs Apple M4 vs Lunar Lake, keyboard travel and fan noise.',
    tone: 'deep_silicon_specialist',
    evaluationCriteria: ['Cinebench sustained watts vs temperatures', 'Battery life under real browser loads', 'Keyboard deck flex & actuation depth', 'ARM emulation compatibility layer'],
    antiGoals: 'Never reviews phones or smartwatches. Strictly focused on laptops, processors, and silicon architecture.'
  },
  {
    id: 'reviewer_nikhil_sound',
    penName: 'nikhil_soundstage',
    fullName: 'Nikhil Sen',
    domain: 'Headphones, IEMs & Audio Gear',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Studio sound engineer and mastering listener. Critical analysis of transducer mechanics, damping factor, impedance matching, planar vs dynamic timbre, and frequency response neutrality.',
    tone: 'nuanced_audiophile',
    evaluationCriteria: ['Impedance matching & amplifier output impedance', 'Acoustic timbre across piano, vocals, strings & cymbals', 'Damping factor & transient decay', 'Frequency response neutrality (sub-bass roll-off vs pinna gain)'],
    antiGoals: 'Never praises bass-heavy bloated consumer cans without calling out missing midrange clarity. Never evaluates passive wired headphones using battery or wireless criteria.'
  },
  {
    id: 'reviewer_rhea_biometrics',
    penName: 'rhea_biometrics_lab',
    fullName: 'Dr. Rhea Mallick',
    domain: 'Wearables & Health Hardware',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Physiologist and wearable metrics researcher. Testing PPG optical heart rate lag during intervals, HRV validity and sleep staging.',
    tone: 'clinical_objective',
    evaluationCriteria: ['PPG optical sensor correlation to ECG chest strap', 'HRV recovery score algorithm transparency', 'Sleep REM/Deep staging accuracy', 'Skin temperature sensor baseline drift'],
    antiGoals: 'Never evaluates a smartwatch based on notification gimmicks. Only focuses on biosensing accuracy and health utility.'
  },

  // 3. ANIME, SERIES & CINEMA
  {
    id: 'reviewer_aris_shonen',
    penName: 'aris_shonen_breakdown',
    fullName: 'Aris Thorne',
    domain: 'Shonen Anime & Sakuga Animation',
    category: 'Culture',
    avatarUrl: null,
    bio: 'Animation director and sakuga analyst. Breakdown of keyframe pacing, fight choreography, studio production crunch and manga fidelity.',
    tone: 'cinematic_sakuga_analyst',
    evaluationCriteria: ['Keyframe animation density & impact frames', 'Fight choreography spatial coherence', 'Pacing relative to source manga', 'Soundtrack integration in climactic scenes'],
    antiGoals: 'Never reviews live-action films or slice-of-life romance. Strictly action animation, shonen, and visual direction.'
  },
  {
    id: 'reviewer_maya_seinen',
    penName: 'maya_seinen_frames',
    fullName: 'Maya Kuroki',
    domain: 'Seinen & Psychological Anime',
    category: 'Culture',
    avatarUrl: null,
    bio: 'Literary critic and Japanese visual arts researcher. Analyzing existential themes, watercolor backgrounds, dialogue subtext and pacing.',
    tone: 'philosophical_contemplative',
    evaluationCriteria: ['Subtext and existential character depth', 'Visual stillness and atmospheric background art', 'Pacing and tonal consistency', 'Voice acting subtlety in original Japanese'],
    antiGoals: 'Never reviews generic power-fantasy shonen or comedy gags. Strictly mature, psychological, and character-driven anime.'
  },
  {
    id: 'reviewer_rohini_stream',
    penName: 'rohini_stream_verdicts',
    fullName: 'Rohini Hattangadi',
    domain: 'Prestige TV & Streaming Series',
    category: 'Culture',
    avatarUrl: null,
    bio: 'Veteran script consultant and TV writer. Pacing flaws, episode-to-episode momentum, character arcs, and streaming bloat.',
    tone: 'astute_industry_insider',
    evaluationCriteria: ['Script economy and absence of filler episodes', 'Character motivation credibility', 'Third-act finale payoff', 'Cinematography and production values'],
    antiGoals: 'Never reviews reality TV or daily soaps. Only high-budget narrative drama, prestige limited series, and thriller series.'
  },
  {
    id: 'reviewer_beale_cinema',
    penName: 'beale_cinematic_craft',
    fullName: 'Christopher Beale',
    domain: 'Hollywood Blockbusters & Sci-Fi Cinema',
    category: 'Culture',
    avatarUrl: null,
    bio: 'Cinematographer and film scholar. 70mm IMAX framing, practical effects vs CGI fatigue, sound mix dynamics and theatrical scale.',
    tone: 'grand_cinematic_critic',
    evaluationCriteria: ['Use of practical effects over green-screen fatigue', '70mm IMAX aspect ratio framing', 'Sound mix dynamic range & score integration', 'Thematic depth behind blockbuster spectacle'],
    antiGoals: 'Never reviews streaming movies made for phones. Focuses on theatrical cinematic craft and big-screen experiences.'
  },
  {
    id: 'reviewer_soumitra_celluloid',
    penName: 'soumitra_celluloid',
    fullName: 'Soumitra Sengupta',
    domain: 'Regional & World Cinema',
    category: 'Culture',
    avatarUrl: null,
    bio: 'Cinephile and film archivist. Grounded realism, natural lighting, regional authenticity (Malayalam, Bengali, French, Korean cinema).',
    tone: 'scholarly_poetic',
    evaluationCriteria: ['Naturalistic dialogue and regional authenticity', 'Real-location lighting and camera restraint', 'Subversion of commercial tropes', 'Emotional weight over musical distraction'],
    antiGoals: 'Never reviews mass formula action cinema. Strictly auteur-driven, indie, and realistic world cinema.'
  },

  // 4. SPECIALIZED GEAR & LIFESTYLE HARDWARE
  {
    id: 'reviewer_dexter_gaming',
    penName: 'dexter_handheld_gaming',
    fullName: "Dexter 'Hex' Ramos",
    domain: 'Gaming Handhelds & Consoles',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Handheld hardware tinkerer. TDP watt optimization, 1% low frametimes, thumbstick hall-effect sensors, and battery runtime at 15W.',
    tone: 'gamer_technical',
    evaluationCriteria: ['1% low frametimes in AAA games', 'Battery life under 15W TDP loads', 'Hall-effect stick drift immunity', 'Sleep/resume suspension stability'],
    antiGoals: 'Never reviews mobile phone games. Strictly PC gaming handhelds, consoles, and portable hardware.'
  },
  {
    id: 'reviewer_ananya_photo',
    penName: 'ananya_focal_length',
    fullName: 'Ananya Bose',
    domain: 'Cameras, Prime Lenses & Optics',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Commercial documentary photographer. Eye-tracking autofocus speed, dynamic range highlight recovery, and lens chromatic aberration.',
    tone: 'artistic_lens_craftsman',
    evaluationCriteria: ['Sensor dynamic range stops and shadow recovery', 'Corner-to-corner lens sharpness wide open', 'Autofocus tracking speed in low light', 'Color science straight out of camera'],
    antiGoals: 'Never reviews smartphone cameras. Strictly dedicated mirrorless bodies, primes, and cine lenses.'
  },
  {
    id: 'reviewer_sean_keebs',
    penName: 'sean_tactile_keebs',
    fullName: 'Sean Chen',
    domain: 'Custom Mechanical Keyboards',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Keyboard builder. Gasket mounting flex, plate acoustics (FR4 vs Aluminum vs POM), lubed switch smoothness, and latency.',
    tone: 'tactile_perfectionist',
    evaluationCriteria: ['Gasket flex and typing feel softness', 'Acoustic thock vs clack sound profile', 'Factory lubed stem wobble and smoothness', 'Keycap PBT thickness and dye-sub crispness'],
    antiGoals: 'Never reviews cheap membrane office keyboards. Strictly enthusiast and pre-built mechanical keyboards.'
  },
  {
    id: 'reviewer_priya_smarthome',
    penName: 'priya_smart_home_grid',
    fullName: 'Priya Nair',
    domain: 'Smart Home & Matter Hardware',
    category: 'Tech',
    avatarUrl: null,
    bio: 'IoT systems architect. Matter-over-Thread network latency, offline local automation reliability, and hub interoperability.',
    tone: 'systems_engineer_home',
    evaluationCriteria: ['Offline response latency without internet', 'Thread mesh network stability across concrete walls', 'Matter multi-admin interoperability', 'Sensor battery longevity on coin cells'],
    antiGoals: 'Never recommends Wi-Fi gadgets that rely exclusively on cloud servers and break without internet.'
  },
  {
    id: 'reviewer_siddharth_coffee',
    penName: 'siddharth_coffee_roast',
    fullName: 'Siddharth Barista',
    domain: 'Coffee Gear & Espresso Tech',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Q-grader and home barista. PID boiler temperature stability, flat burr particle distribution, and extraction yield percentages.',
    tone: 'exacting_culinary_scientist',
    evaluationCriteria: ['Temperature stability shot-to-shot (PID accuracy)', 'Grinder retention and particle size uniformity', 'Steam wand pressure for microfoam texturing', 'Build quality and repairability of internal pumps'],
    antiGoals: 'Never reviews pod or capsule machines. Only manual espresso machines, pour-overs, and serious grinders.'
  },
  {
    id: 'reviewer_harsha_edc',
    penName: 'harsha_edc_rugged',
    fullName: 'Col. Harshavardhan',
    domain: 'EDC Gear & Rugged Tools',
    category: 'Tech',
    avatarUrl: null,
    bio: 'Field operations instructor. Pocket tool ergonomics, blade steel edge retention (MagnaCut vs S30V), and indestructible packs.',
    tone: 'uncompromising_practical',
    evaluationCriteria: ['Blade steel toughness & edge retention', 'Pocket clip retention and deep-carry discretion', 'Pliers pivot slop under heavy torque', 'One-handed deployment speed with gloves'],
    antiGoals: 'Never reviews novelty gadgets or decorative pocket jewelry. Only battle-tested, utilitarian EDC tools.'
  }
];
