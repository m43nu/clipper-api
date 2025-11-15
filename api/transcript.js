import { YoutubeTranscript } from "youtube-transcript";

export default async function handler(req, res) {
    try {
        // ✅ Body-Handling (Node-Function, kein req.json)
        const buffers = [];
        for await (const chunk of req) buffers.push(chunk);
        const data = JSON.parse(Buffer.concat(buffers).toString());
        const { url } = data;

        if (!url) {
            return res.status(400).json({ error: "Missing URL" });
        }

        // ✅ Extract video ID
        const match = url.match(
            /(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/
        );
        const videoId = match?.[1];
        if (!videoId) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        // ✅ Try to get transcript
        try {
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            const text = transcript.map(t => `${t.offset}s: ${t.text}`).join("\n");
            return res.status(200).json({ videoId, transcript: text });
        } catch (err) {
            return res.status(404).json({ error: "Transcript not found", videoId });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message });
    }
}
