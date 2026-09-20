import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Returns the complete pre-packaged daily payload for autonomous social posting.
 */
export async function getDailyCampaignPayload(dayNumber = 1, baseUrl = 'https://writon.cc') {
  const day = parseInt(dayNumber, 10) || 1;

  const payloads = {
    1: {
      day: 1,
      theme: 'The Pen Name Landgrab',
      hook: 'In 6 months, you’ll wish you claimed your pen name today.',
      deliveryId: '2609_d01_ig_carousel_en_landgrab',
      shortlink: `${baseUrl}/go/2609_d01_ig_carousel_en_landgrab`,
      mediaType: 'carousel',
      imageAssets: [
        'day1_slide_1.png',
        'day1_slide_2.png',
        'day1_slide_3.png',
        'day1_slide_4.png',
        'day1_slide_5.png',
      ],
      captions: {
        en: `How many times have you signed up for a platform only to find that your own name was already taken?\n\nThe early Substack writers in 2018 and early Medium authors in 2015 built massive followings simply by showing up when the doors first opened.\n\nToday, WritOn is opening its doors.\n\nYour ideal pen name (@handle) is available right now.\n\nClaim it before someone else does:\n📲 ${baseUrl}/go/2609_d01_ig_carousel_en_landgrab\n\n#writon #writingcommunity #writersoftwitter #creators #poetry #essayist #amwriting`,
        hi: `६ महीने बाद आप सोचेंगे — काश मैंने WritOn पर अपना नाम पहले रजिस्टर कर लिया होता! 🖋️\n\nसोशल मीडिया के शोर से दूर, WritOn एक शांत जगह है जहाँ सिर्फ कहानियों और कविताओं की कद्र होती है।\n\n✨ अपना पसंदीदा कलम-नाम (@handle) आज ही क्लेम करें:\n📲 ${baseUrl}/go/2609_d01_x_post_hi_landgrab\n\n#writon #हिंदीसाहित्य #लेखक #कविता #शायरी #writingcommunity`,
        bn: `৬ মাস পর আপনার মনে হবে — WritOn-এ যদি প্রথম দিন থেকেই লেখা শুরু করতাম! 📖\n\nসোশ্যাল মিডিয়ার কোলাহল ছেড়ে লেখকদের নিজস্ব ঠিকানা এখন WritOn। আপনার আসল পেন-নেম (@handle) এখনই বুক করুন।\n📲 ${baseUrl}/go/2609_d01_threads_bn_landgrab\n\n#writon #বাংলাসাহিত্য #কবিতা #গল্প #writingcommunity`,
        mr: `६ महिन्यांनंतर तुम्हाला वाटेल — WritOn वर आधीच लिहायला सुरुवात करायला हवी होती! ✍️\n\nतुमचे आवडते टोपणनाव (@handle) आजच क्लेम करा आणि मुख्य Daily Deck वर झळका:\n📲 ${baseUrl}/go/2609_d01_x_post_mr_landgrab\n\n#writon #मराठीसाहित्य #कविता #मराठीलेखक #writingcommunity`,
      },
    },
    2: {
      day: 2,
      theme: 'The Notes App Graveyard',
      hook: 'The graveyard of great writing isn’t rejection letters. It’s the Notes app on your phone.',
      deliveryId: '2609_d02_ig_carousel_en_notes',
      shortlink: `${baseUrl}/go/2609_d02_ig_carousel_en_notes`,
      mediaType: 'carousel',
      imageAssets: [
        'day2_slide_1.png',
        'day2_slide_2.png',
        'day2_slide_3.png',
        'day2_slide_4.png',
        'day2_slide_5.png',
      ],
      captions: {
        en: `The graveyard of great writing isn't rejection letters. It's the Notes app on your phone.\n\nYou wrote something at 2:00 AM. It made your chest tight. You promised you'd publish it somewhere, but where?\n\nInstagram wants 9:16 dancing videos. Twitter wants partisan arguments. Medium wants a paywall.\n\nWe built WritOn as a sanctuary for prose, poetry, and thoughtful essays.\n\nTake that note out of the dark. Publish your first card today.\n\n📲 Download on Google Play: ${baseUrl}/go/2609_d02_ig_carousel_en_notes\n\n#writon #notesapp #writing #prose #poetrysociety #microfiction #creativewriting #writersoftwitter #amwriting`,
        hi: `दुनिया की सबसे बेहतरीन कहानियाँ किसी किताब में नहीं, आपके फोन के 'Notes' ऐप में दबी पड़ी हैं। 📱✨\n\nअपने विचारों को 'Notes' से बाहर निकालिए और आज ही WritOn पर शेयर कीजिए:\n📲 ${baseUrl}/go/2609_d02_x_post_hi_notes\n\n#writon #हिंदीसाहित्य #लेखक #कहानी #कविता #शायरी #writingcommunity`,
        bn: `আপনার সবচেয়ে প্রিয় লেখাগুলো কি এখনও ফোনের 'Notes' ফোল্ডারে বন্দি? 📝\n\nমাঝরাতে হঠাৎ মনে আসা কবিতা বা অসমাপ্ত ছোটগল্পগুলোকে এবার আলো দেখতে দিন:\n📲 ${baseUrl}/go/2609_d02_threads_bn_notes\n\n#writon #বাংলাসাহিত্য #কবিতা #গল্প #writingcommunity`,
        mr: `तुमच्या मनातील उत्तम विचार आणि कविता अजूनही मोबाईलच्या 'Notes' मध्येच बंद आहेत का? 📖\n\nतुमच्या त्या सुंदर ओळींना आता खरे वाचक मिळवून द्या:\n📲 ${baseUrl}/go/2609_d02_x_post_mr_notes\n\n#writon #मराठीसाहित्य #कविता #मराठीलेखक #writingcommunity`,
      },
    },
    3: {
      day: 3,
      theme: 'The Ground Floor Advantage',
      hook: 'In 2015, Medium. In 2018, Substack. Today, WritOn.',
      deliveryId: '2609_d03_ig_carousel_en_groundfloor',
      shortlink: `${baseUrl}/go/2609_d03_ig_carousel_en_groundfloor`,
      mediaType: 'carousel',
      imageAssets: [
        'day3_en_slide_1.png',
        'day3_en_slide_2.png',
        'day3_en_slide_3.png',
        'day3_en_slide_4.png',
        'day3_en_slide_5.png',
      ],
      captions: {
        en: `In 2015, the first writers on Medium built massive followings.\nIn 2018, early Substack writers built lifelong audiences.\n\nRight now, a new sanctuary for essays, poetry, and short fiction called WritOn is opening its doors.\n\nEarly platforms create unfair creator advantages: your ideal pen name (@handle) is free, and early stories are pinned to the top of the daily deck.\n\nDon't wait until Year 3 to wish you had started at Day 1.\n\n📲 Claim your pen name today: ${baseUrl}/go/2609_d03_ig_carousel_en_groundfloor\n\n#writon #writingcommunity #writersoftwitter #creators #poetry #storytelling #books #amwriting`,
        hi: `इतिहास खुद को दोहराता है:\n• 2015 में Medium पर लिखने वाले शुरुआती लेखक बड़े लेखक बने।\n• 2018 में Substack पर आने वाले लेखकों ने सबसे मजबूत पाठक वर्ग तैयार किया।\n\n2026 में, लेखकों और विचारकों के लिए एक नया मंच तैयार है — WritOn!\n\nयहाँ आपका पसंदीदा पेन-नेम अभी खाली है, और शुरुआती रचनाओं को मुख्य स्क्रीन पर फीचर किया जा रहा है।\n\nशुरुआत आज ही करें:\n📲 ${baseUrl}/go/2609_d03_x_hi_groundfloor\n\n#writon #हिंदीसाहित्य #लेखक #कहानी #कविता #शायरी #writingcommunity #writersoftwitter`,
        bn: `প্রথম সারির লেখকদের সবসময় এক অনন্য সুবিধা থাকে:\nনতুন প্ল্যাটফর্ম যখন শুরু হয়, তখন প্রতিভার সবচেয়ে বেশি মূল্যায়ন হয়।\n\nWritOn-এর দরজা আজ উন্মুক্ত:\n• আপনার আসল নাম ও পেন-নেম এখনও বুক করা সম্ভব।\n• হোমপেজের ডেইলি ডেকে সেরা লেখার স্থান নিশ্চিত।\n• বিজ্ঞাপনহীন বিশুদ্ধ সাহিত্যের ঠিকানা।\n\nপ্রথম দিন থেকেই থাকুন পাঠকদের নজরে:\n📲 ${baseUrl}/go/2609_d03_threads_bn_groundfloor\n\n#writon #বাংলাসাহিত্য #কবিতা #গল্প #writingcommunity #creators`,
        mr: `इतिहास पुन्हा घडतो:\n• २०१५ मध्ये Medium वरील सुरुवातीचे लेखक मोठे झाले।\n• २०१८ मध्ये Substack वरील लेखकांनी निष्ठावान वाचकवर्ग उभा केला।\n\n२०२६ मध्ये, विचारवंत आणि लेखकांसाठी एक नवीन व्यासपीठ सज्ज आहे — WritOn!\n\nआजच तुमचे नाव नोंदवा आणि पहिल्या दिवसापासून वाचकांपर्यंत पोहोचा:\n📲 ${baseUrl}/go/2609_d03_x_mr_groundfloor\n\n#writon #मराठीसाहित्य #कविता #मराठीलेखक #writingcommunity #creators`,
      },
    },
    4: {
      day: 4,
      theme: 'The Anti-Casino Sanctuary',
      hook: 'Where do writers go when every app becomes a casino?',
      deliveryId: '2609_d04_ig_manifesto_en_sanctuary',
      shortlink: `${baseUrl}/go/2609_d04_ig_manifesto_en_sanctuary`,
      mediaType: 'manifesto',
      imageAssets: ['day4_manifesto.png'],
      captions: {
        en: `The internet used to be a library. Now it’s a slot machine.\n\nWritOn is an intentional rejection of that noise. 3-minute swipeable card decks, clean typography, zero video noise, no ad popups.\n\nIf you have words that deserve to be read quietly and carefully, publish on WritOn today.\n📲 ${baseUrl}/go/2609_d04_ig_manifesto_en_sanctuary\n\n#writon #literarysanctuary #slowliving #readersofig #writingcommunity #writersoftwitter`,
        hi: `इंटरनेट पहले एक शांत लाइब्रेरी जैसा था, अब सिर्फ शोर का बाज़ार बन चुका है। 📚\n\nअगर आप रील्स और बेवजह की बहसबाजी से थक चुके हैं, तो WritOn आपके लिए एक सुकून भरा कोना है।\n📲 ${baseUrl}/go/2609_d04_x_post_hi_sanctuary\n\n#writon #हिंदीसाहित्य #लेखक #किताबें #writingcommunity`,
      },
    },
    5: {
      day: 5,
      theme: 'Founding Writer Spotlight',
      hook: 'Spotlighting our first 100 Founding Writers.',
      deliveryId: '2609_d05_ig_spotlight_en_creator',
      shortlink: `${baseUrl}/go/2609_d05_ig_spotlight_en_creator`,
      mediaType: 'spotlight',
      imageAssets: ['day5_spotlight.png'],
      captions: {
        en: `We are hand-selecting the first 100 Founding Writers on WritOn. 🖋️\n\nEvery day, our editorial team selects handcrafted stories, poems, and essays and pins them to the top of the Daily Deck.\n\nClaim your spot:\n📲 ${baseUrl}/go/2609_d05_ig_spotlight_en_creator\n\n#writon #foundingwriters #writerswanted #writingcommunity #writersoftwitter #creators`,
      },
    },
  };

  return payloads[day] || payloads[1];
}

/**
 * Dispatches the daily payload to an external webhook (e.g. Discord, Telegram, Zapier, Buffer).
 */
export async function dispatchToWebhook(payload, webhookUrl) {
  if (!webhookUrl) {
    return { dispatched: false, reason: 'No webhook URL configured' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `📢 **WritOn Daily Campaign [Day ${payload.day}]: ${payload.theme}**\n\n🔗 Shortlink: ${payload.shortlink}\n\n📝 **Caption (EN):**\n${payload.captions.en}`,
        embeds: [
          {
            title: payload.hook,
            description: payload.captions.en,
            url: payload.shortlink,
            color: 0xe75a2a,
          },
        ],
      }),
    });

    return {
      dispatched: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      dispatched: false,
      error: error.message,
    };
  }
}
