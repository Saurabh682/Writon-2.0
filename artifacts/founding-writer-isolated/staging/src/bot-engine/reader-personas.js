/**
 * 100 Authentic Reader Personas for WritOn
 * Dedicated exclusively to reading and applauding stories.
 * No LLM token cost, zero posting permissions.
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

function isFemaleReader(name) {
  const firstName = (name || '').trim().split(' ')[0].toLowerCase();
  const femaleSet = new Set([
    'ananya', 'priya', 'neha', 'tanvi', 'kavitha', 'meera', 'zoya', 'pooja', 'divya',
    'shreya', 'bhavna', 'deepa', 'gayatri', 'ishani', 'kriti', 'monica', 'pallavi',
    'richa', 'vidya', 'yamini', 'zainab', 'barkha', 'darshana', 'falguni', 'hina',
    'jyoti', 'lavanya', 'nandini', 'parul', 'smriti', 'urvashi', 'wendy', 'yasmin',
    'aarushi', 'chandana', 'devika', 'farida', 'ira', 'kalyani', 'manjira', 'prerna',
    'roshni', 'trisha', 'vandana', 'zarina', 'amrita'
  ]);
  return femaleSet.has(firstName);
}

const RAW_READER_DATA = [
  { penName: 'ananya_reads', fullName: 'Ananya Sharma', bio: 'Avid reader of contemporary Indian poetry and lyrical prose.', categories: ['Poetry', 'Shayari', 'Essays'] },
  { penName: 'vikram_t', fullName: 'Vikram Thakur', bio: 'Distributed systems engineer. Reading about kernel design, high scale, and tech history.', categories: ['Tech', 'Essays'] },
  { penName: 'priya_m', fullName: 'Priya Mukherjee', bio: 'Literature student exploring post-colonial essays and modern short fiction.', categories: ['Short Stories', 'Philosophy', 'Culture'] },
  { penName: 'rohit_sen', fullName: 'Rohit Sengupta', bio: 'Bengali literature and history enthusiast. Coffee and essays.', categories: ['Essays', 'Culture', 'Philosophy'] },
  { penName: 'neha_v', fullName: 'Neha Verma', bio: 'Poetry lover, Urdu ghazal reader, and occasional reviewer.', categories: ['Poetry', 'Shayari', 'Reviews'] },
  { penName: 'rahul_k', fullName: 'Rahul Kapoor', bio: 'Frontend engineer & UI designer reading tech insights and satire.', categories: ['Tech', 'Humour'] },
  { penName: 'tanvi_d', fullName: 'Tanvi Deshmukh', bio: 'Curator of short fiction and urban memoirs from Bombay to Bangalore.', categories: ['Short Stories', 'Culture'] },
  { penName: 'aditya_n', fullName: 'Aditya Narayan', bio: 'Deep tech, AI safety, and philosophical musings on consciousness.', categories: ['Tech', 'Philosophy'] },
  { penName: 'kavitha_r', fullName: 'Kavitha Ramachandran', bio: 'South Indian literature, translated poems, and cultural commentaries.', categories: ['Poetry', 'Culture', 'Essays'] },
  { penName: 'siddharth_b', fullName: 'Siddharth Bose', bio: 'Political economy, journalism, and long-form investigative writing.', categories: ['Journalism', 'Essays', 'Reviews'] },
  { penName: 'meera_iyer', fullName: 'Meera Iyer', bio: 'Carnatic music listener, ancient philosophy reader, and essay collector.', categories: ['Philosophy', 'Culture'] },
  { penName: 'arjun_reddy', fullName: 'Arjun Reddy', bio: 'Product manager reading about systems engineering, scaling, and team culture.', categories: ['Tech', 'Essays'] },
  { penName: 'zoya_khan', fullName: 'Zoya Khan', bio: 'Urdu poetry lover, Ghalib & Faiz collector, and classical literature admirer.', categories: ['Shayari', 'Poetry', 'Culture'] },
  { penName: 'tarun_j', fullName: 'Tarun Joshi', bio: 'Himalayan traveler reading memoirs, travel essays, and environmental journalism.', categories: ['Essays', 'Journalism'] },
  { penName: 'pooja_h', fullName: 'Pooja Hegde', bio: 'Book reviewer, avid consumer of humor, satire, and lighthearted prose.', categories: ['Humour', 'Reviews', 'Short Stories'] },
  { penName: 'kunal_m', fullName: 'Kunal Malhotra', bio: 'Fintech builder exploring macroeconomics, technology architecture, and startup culture.', categories: ['Tech', 'Essays'] },
  { penName: 'divya_p', fullName: 'Divya Patel', bio: 'Architect reading on urban design, city aesthetics, and modern culture.', categories: ['Culture', 'Essays'] },
  { penName: 'harsh_v', fullName: 'Harsh Vardhan', bio: 'Data engineer reading algorithms, data structures, and tech history.', categories: ['Tech'] },
  { penName: 'shreya_g', fullName: 'Shreya Ghosh', bio: 'Kolkata book club regular reading magical realism and modern poetry.', categories: ['Poetry', 'Short Stories'] },
  { penName: 'manish_r', fullName: 'Manish Rawat', bio: 'Exploring ethics, stoicism, Eastern philosophy, and mindfulness.', categories: ['Philosophy', 'Essays'] },
  { penName: 'aakash_g', fullName: 'Aakash Gupta', bio: 'Software architect interested in microservices and distributed consensus.', categories: ['Tech'] },
  { penName: 'bhavna_s', fullName: 'Bhavna Sundaram', bio: 'Tamil literature translations, poetry collections, and feminist essays.', categories: ['Poetry', 'Essays', 'Culture'] },
  { penName: 'chirag_p', fullName: 'Chirag Parekh', bio: 'Standup comedy fan, reader of satire, humour, and witty cultural pieces.', categories: ['Humour', 'Reviews'] },
  { penName: 'deepa_n', fullName: 'Deepa Nambiar', bio: 'Malayalam short fiction enthusiast and Malayalam-to-English translation reader.', categories: ['Short Stories', 'Culture'] },
  { penName: 'ehsaan_a', fullName: 'Ehsaan Ali', bio: 'Lucknow heritage, Dastangoi tradition, and soulful ghazal reading.', categories: ['Shayari', 'Culture'] },
  { penName: 'farhan_s', fullName: 'Farhan Sheikh', bio: 'Cloud architect reading DevOps, Linux kernel, and open-source essays.', categories: ['Tech'] },
  { penName: 'gayatri_k', fullName: 'Gayatri Kulkarni', bio: 'Marathi literature fan, history buff, and philosophy reader.', categories: ['Philosophy', 'Culture', 'Essays'] },
  { penName: 'himanshu_s', fullName: 'Himanshu Saini', bio: 'Long-distance runner reading resilience memoirs and investigative journalism.', categories: ['Journalism', 'Essays'] },
  { penName: 'ishani_b', fullName: 'Ishani Banerjee', bio: 'Bengal renaissance, Tagore translations, and modern lyrical poetry.', categories: ['Poetry', 'Culture'] },
  { penName: 'jatin_k', fullName: 'Jatin Kohli', bio: 'Tech enthusiast reading about Rust, WebAssembly, and compiler designs.', categories: ['Tech'] },
  { penName: 'kriti_m', fullName: 'Kriti Mathur', bio: 'Fiction lover, mystery novel reader, and creative writing enthusiast.', categories: ['Short Stories', 'Reviews'] },
  { penName: 'lakshay_c', fullName: 'Lakshay Chawla', bio: 'Startup founder reading product strategy, technology, and leadership essays.', categories: ['Tech', 'Essays'] },
  { penName: 'monica_r', fullName: 'Monica Rao', bio: 'Environmental researcher reading climate journalism, nature essays, and poetry.', categories: ['Journalism', 'Essays', 'Poetry'] },
  { penName: 'nikhil_t', fullName: 'Nikhil Trivedi', bio: 'Sanskrit aesthetics, philosophy of mind, and ancient poetic meters.', categories: ['Philosophy', 'Poetry'] },
  { penName: 'omkar_j', fullName: 'Omkar Jadhav', bio: 'Full-stack developer enjoying tech blogs, system design, and dev humor.', categories: ['Tech', 'Humour'] },
  { penName: 'pallavi_s', fullName: 'Pallavi Sengupta', bio: 'Art history, museum curator notes, and cultural anthropology reader.', categories: ['Culture', 'Essays'] },
  { penName: 'qasim_m', fullName: 'Qasim Mir', bio: 'Kashmiri literature, Sufi poetry, and historical essays.', categories: ['Poetry', 'Shayari', 'Culture'] },
  { penName: 'richa_s', fullName: 'Richa Shukla', bio: 'Hindi poetry lover, Harivansh Rai Bachchan fan, and cultural critic.', categories: ['Poetry', 'Culture'] },
  { penName: 'sahil_d', fullName: 'Sahil Deshpande', bio: 'Cybersecurity analyst reading threat intelligence and tech philosophy.', categories: ['Tech', 'Philosophy'] },
  { penName: 'tanmay_b', fullName: 'Tanmay Bhatia', bio: 'Satirical essays, modern workplace parodies, and light reading.', categories: ['Humour', 'Essays'] },
  { penName: 'upendra_m', fullName: 'Upendra Mishra', bio: 'Vedic philosophy, comparative religion, and ethical inquiries.', categories: ['Philosophy'] },
  { penName: 'varun_g', fullName: 'Varun Garg', bio: 'Backend engineer exploring database internals, Postgres, and high throughput.', categories: ['Tech'] },
  { penName: 'vidya_k', fullName: 'Vidya Krishnan', bio: 'Health journalism, science communication, and public health essays.', categories: ['Journalism', 'Essays'] },
  { penName: 'waseem_a', fullName: 'Waseem Akram', bio: 'Urdu nazms, shayari, and literary essays from the subcontinent.', categories: ['Shayari', 'Poetry'] },
  { penName: 'yash_v', fullName: 'Yash Vardhan', bio: 'Urban architecture, smart cities, and speculative fiction reader.', categories: ['Short Stories', 'Tech'] },
  { penName: 'yamini_r', fullName: 'Yamini Roy', bio: 'Short story collector, flash fiction reader, and literary critic.', categories: ['Short Stories', 'Reviews'] },
  { penName: 'zainab_f', fullName: 'Zainab Fatima', bio: 'Poetry enthusiast exploring modern feminist voices and ghazals.', categories: ['Poetry', 'Shayari'] },
  { penName: 'abhinav_s', fullName: 'Abhinav Saxena', bio: 'Engineering manager reading about distributed teams and software craft.', categories: ['Tech', 'Essays'] },
  { penName: 'barkha_d', fullName: 'Barkha Dutt', bio: 'Independent journalism, ground reporting, and social essays.', categories: ['Journalism', 'Essays'] },
  { penName: 'chetan_p', fullName: 'Chetan Patel', bio: 'Gujarati literature enthusiast, business biographies, and essays.', categories: ['Essays', 'Culture'] },
  { penName: 'darshana_k', fullName: 'Darshana K', bio: 'Book reviewer specializing in contemporary Asian literature.', categories: ['Reviews', 'Short Stories'] },
  { penName: 'ekansh_m', fullName: 'Ekansh Mittal', bio: 'Algorithmic trading, quantitative finance, and technology architecture.', categories: ['Tech'] },
  { penName: 'falguni_r', fullName: 'Falguni Roy', bio: 'Folk art, tribal folklore, and Indian cultural heritage reader.', categories: ['Culture', 'Essays'] },
  { penName: 'gautam_s', fullName: 'Gautam Singhal', bio: 'Philosophy of science, epistemology, and historical physics.', categories: ['Philosophy', 'Tech'] },
  { penName: 'hina_k', fullName: 'Hina Kausar', bio: 'Urdu short stories, Manto fan, and classic narrative prose.', categories: ['Short Stories', 'Culture'] },
  { penName: 'indranil_d', fullName: 'Indranil Das', bio: 'Bengali detective fiction, Satyajit Ray fan, and mystery reader.', categories: ['Short Stories', 'Culture'] },
  { penName: 'jyoti_p', fullName: 'Jyoti Prasad', bio: 'Hindi literature, Chhayavad poetry, and cultural essays.', categories: ['Poetry', 'Culture'] },
  { penName: 'karan_b', fullName: 'Karan Bhasin', bio: 'Macroeconomics, public policy, and institutional design reader.', categories: ['Essays', 'Journalism'] },
  { penName: 'lavanya_s', fullName: 'Lavanya Swaminathan', bio: 'Classical Sanskrit drama, mythology retellings, and poetry.', categories: ['Poetry', 'Culture'] },
  { penName: 'mohit_a', fullName: 'Mohit Agarwal', bio: 'Embedded systems, IoT, and edge computing articles.', categories: ['Tech'] },
  { penName: 'nandini_r', fullName: 'Nandini Raghavan', bio: 'Classical music aesthetics, temple architecture, and history.', categories: ['Culture', 'Essays'] },
  { penName: 'om_p', fullName: 'Om Prakash', bio: 'Ancient Indian mathematics, astronomy, and science history.', categories: ['Philosophy', 'Tech'] },
  { penName: 'parul_s', fullName: 'Parul Sabharwal', bio: 'Food writing, culinary memoirs, and regional heritage essays.', categories: ['Culture', 'Essays'] },
  { penName: 'quresh_b', fullName: 'Quresh Bandukwala', bio: 'Historical trade routes, Silk Road stories, and travel writing.', categories: ['Culture', 'Short Stories'] },
  { penName: 'raghav_m', fullName: 'Raghav Mahajan', bio: 'Cloud native computing, Kubernetes, and Golang backend systems.', categories: ['Tech'] },
  { penName: 'smriti_k', fullName: 'Smriti Kaul', bio: 'Kashmiri literature, folklore, and Himalayan landscape essays.', categories: ['Culture', 'Essays', 'Poetry'] },
  { penName: 'tushar_g', fullName: 'Tushar Goel', bio: 'AI research papers, machine learning systems, and deep tech.', categories: ['Tech'] },
  { penName: 'urvashi_b', fullName: 'Urvashi Bhat', bio: 'Contemporary Indian fiction, book club discussions, and reviews.', categories: ['Reviews', 'Short Stories'] },
  { penName: 'vineet_k', fullName: 'Vineet Kulkarni', bio: 'Cybersecurity, cryptography, and privacy technology essays.', categories: ['Tech'] },
  { penName: 'wendy_d', fullName: 'Wendy D’Souza', bio: 'Goan heritage, colonial history, and coastal short stories.', categories: ['Short Stories', 'Culture'] },
  { penName: 'xavier_f', fullName: 'Xavier Fernandes', bio: 'Music journalism, vinyl culture, and audio engineering essays.', categories: ['Culture', 'Essays'] },
  { penName: 'yasmin_b', fullName: 'Yasmin Begum', bio: 'Hyderabadi culture, Deccan history, and Urdu poetry admirer.', categories: ['Shayari', 'Culture'] },
  { penName: 'zubair_a', fullName: 'Zubair Ansari', bio: 'Persian and Urdu literature, calligraphy aesthetics, and poetry.', categories: ['Shayari', 'Poetry'] },
  { penName: 'aarushi_s', fullName: 'Aarushi Singhania', bio: 'Modern poetry, visual arts, and indie zines reader.', categories: ['Poetry', 'Culture'] },
  { penName: 'bhupesh_m', fullName: 'Bhupesh Mohan', bio: 'Linux sysadmin reading shell scripting, hardware, and tech.', categories: ['Tech'] },
  { penName: 'chandana_r', fullName: 'Chandana Rao', bio: 'Telugu literature, folk ballads, and cultural histories.', categories: ['Culture', 'Poetry'] },
  { penName: 'devika_m', fullName: 'Devika Menon', bio: 'Ecological philosophy, biodiversity essays, and nature writing.', categories: ['Philosophy', 'Essays'] },
  { penName: 'eshwar_k', fullName: 'Eshwar Kumar', bio: 'Full-stack engineering, web performance, and browser tech.', categories: ['Tech'] },
  { penName: 'farida_p', fullName: 'Farida Patel', bio: 'Parsi theatre, Bombay history, and urban nostalgia.', categories: ['Culture', 'Humour'] },
  { penName: 'girish_n', fullName: 'Girish Nayak', bio: 'Philosophy of language, semiotics, and cognitive science.', categories: ['Philosophy', 'Essays'] },
  { penName: 'hemant_r', fullName: 'Hemant Rathore', bio: 'Rajasthani folklore, desert memoirs, and heritage essays.', categories: ['Culture', 'Short Stories'] },
  { penName: 'ira_s', fullName: 'Ira Sen', bio: 'Graphic novels, visual storytelling, and short fiction.', categories: ['Short Stories', 'Reviews'] },
  { penName: 'jitendra_v', fullName: 'Jitendra Verma', bio: 'Open-source software, digital rights, and tech journalism.', categories: ['Tech', 'Journalism'] },
  { penName: 'kalyani_b', fullName: 'Kalyani Balan', bio: 'Contemporary poetry, modern verse, and essay collections.', categories: ['Poetry', 'Essays'] },
  { penName: 'lokesh_p', fullName: 'Lokesh Pandey', bio: 'Bhojpuri folk culture, Hindi literature, and village memoirs.', categories: ['Culture', 'Short Stories'] },
  { penName: 'manjira_d', fullName: 'Manjira Datta', bio: 'Documentary films, visual culture, and critical essays.', categories: ['Culture', 'Essays'] },
  { penName: 'naveen_k', fullName: 'Naveen Kurup', bio: 'Kathakali aesthetics, Kerala history, and short stories.', categories: ['Culture', 'Short Stories'] },
  { penName: 'ojas_m', fullName: 'Ojas Mehta', bio: 'Tech humor, developer parodies, and software craftsmanship.', categories: ['Humour', 'Tech'] },
  { penName: 'prerna_g', fullName: 'Prerna Gupta', bio: 'Psychology essays, human behavior, and emotional memoirs.', categories: ['Essays', 'Philosophy'] },
  { penName: 'qasim_r', fullName: 'Qasim Rizvi', bio: 'Lucknowi tehzeeb, Awadhi literature, and poetry.', categories: ['Shayari', 'Culture'] },
  { penName: 'roshni_b', fullName: 'Roshni Bhatt', bio: 'Gujarati poetry, folk tales, and cultural essays.', categories: ['Poetry', 'Culture'] },
  { penName: 'saurav_m', fullName: 'Saurav Mukhopadhyay', bio: 'Data science, graph theory, and algorithmic philosophy.', categories: ['Tech', 'Philosophy'] },
  { penName: 'trisha_d', fullName: 'Trisha Das', bio: 'Urban mythology retellings, feminist short fiction.', categories: ['Short Stories', 'Culture'] },
  { penName: 'utkarsh_j', fullName: 'Utkarsh Jain', bio: 'Venture capital, startup architecture, and software scale.', categories: ['Tech', 'Essays'] },
  { penName: 'vandana_s', fullName: 'Vandana Soni', bio: 'Hindi poetry, contemporary shayaris, and emotional prose.', categories: ['Poetry', 'Shayari'] },
  { penName: 'waris_k', fullName: 'Waris Khan', bio: 'Punjabi Sufi poetry, Bulleh Shah enthusiast, and folk culture.', categories: ['Poetry', 'Culture'] },
  { penName: 'yogesh_p', fullName: 'Yogesh Patil', bio: 'Marathi theatre, social drama, and cultural commentaries.', categories: ['Culture', 'Essays'] },
  { penName: 'zarina_m', fullName: 'Zarina Merchant', bio: 'Old Bombay memoirs, architectural heritage, and short stories.', categories: ['Culture', 'Short Stories'] },
  { penName: 'amrita_p', fullName: 'Amrita Pritam Fan', bio: 'Punjabi literature, poignant poetry, and deep human memoirs.', categories: ['Poetry', 'Culture', 'Essays'] },
  { penName: 'deepak_c', fullName: 'Deepak Chopra Fan', bio: 'Mindfulness, consciousness exploration, and holistic philosophy.', categories: ['Philosophy', 'Essays'] }
];

let readerMaleIdx = 0;
let readerFemaleIdx = 0;

export const CURATED_READER_PERSONAS = RAW_READER_DATA.map((r, index) => {
  const cleanHandle = r.penName.startsWith('reader_') ? r.penName : 'reader_' + r.penName;
  const hasNoPhoto = (index % 5 === 0 || index % 5 === 2); // 40% default initial badge
  let avatarUrl = null;
  if (!hasNoPhoto) {
    const isFem = isFemaleReader(r.fullName);
    avatarUrl = isFem
      ? `${FEMALE_AVATARS[(readerFemaleIdx++) % FEMALE_AVATARS.length]}&gender=female&uid=reader_${index + 1}`
      : `${MALE_AVATARS[(readerMaleIdx++) % MALE_AVATARS.length]}&gender=male&uid=reader_${index + 1}`;
  }

  return {
    id: 'bot_reader_' + String(index + 1).padStart(3, '0'),
    penName: cleanHandle,
    fullName: r.fullName,
    bio: r.bio,
    avatarUrl,
    categories: r.categories,
    botType: 'reader',
    isActive: true,
    likeProbability: 0.85 + (index % 10) * 0.01,
    commentProbability: 0.0, // Reader bots never comment
    postFrequencyHours: 9999, // Reader bots never post
    commentStyle: 'applaud_only'
  };
});
