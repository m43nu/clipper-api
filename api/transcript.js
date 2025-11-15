import { YoutubeTranscript } from "youtube-transcript";

export default async function handler(req, res) {
  try {
    const { url } = await req.json();
    if (!url) {
      return res.status(400).json({ error: "Missing URL" });
    }

    // Extract ID from URL
    const match = url.match(
      /(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/
    );
    const videoId = match?.[1];
    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    // Try fetching transcript
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      const text = transcript.map(t => `${t.offset}s: ${t.text}`).join("\n");
      return res.status(200).json({ videoId, transcript: text });
    } catch (err) {
      // Fallback, if transcript disabled
      return res.status(404).json({ error: "Transcript not found", videoId });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

