async function check() {
  const res = await fetch('https://chatgpt.com/share/6aac49ee-89d8-83ee-927f-b058cd12117c');
  const text = await res.text();
  const titleMatch = text.match(/<title>([^<]+)<\/title>/);
  console.log('Title:', titleMatch ? titleMatch[1] : 'No title');

  // Look for text fragments
  const paragraphs = text.match(/"text":\s*"([^"]+)"/g);
  if (paragraphs) {
    console.log('Found text matches:', paragraphs.length);
    console.log('Sample:', paragraphs.slice(0, 3));
  }
}
check().catch(console.error);
