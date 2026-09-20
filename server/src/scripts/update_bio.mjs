import dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';

dotenv.config();

const client = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

async function updateBio() {
  try {
    const rwClient = client.readWrite;
    const profile = await rwClient.v1.updateAccountProfile({
      description: "A quiet home for writers and readers. Daily craft notes + prompts. Inviting 25 founding writers ↓",
      url: "https://writon.cc/x"
    });
    console.log("Bio updated successfully!", profile.description);
  } catch (error) {
    console.error("Error updating bio:", error);
  }
}

updateBio();
