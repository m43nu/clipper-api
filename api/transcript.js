import { YoutubeTranscript } from "youtube-transcript";

export default async function handler(req, res) {
    try {
        // 🧠 Body einlesen
        const buffers = [];
        for await (const chunk of req) buffers.push(chunk);
        const data = JSON.parse(Buffer.concat(buffers).toString());
        const { url } = data;

        if (!url) {
            return res.status(400).json({ error: "Missing URL" });
        }

        // 🔍 Video-ID extrahieren
        const match = url.match(
            /(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/
        );
        const videoId = match?.[1];
        if (!videoId) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        // 🗣️ 1️⃣ Versuch: offizielles Transcript
        try {
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            const text = transcript
                .map((t) => `${Math.round(t.offset)}s: ${t.text}`)
                .join("\n");

            return res.status(200).json({
                videoId,
                source: "youtube-transcript",
                transcript: text,
            });
        } catch (err) {
            console.warn(`No YouTube transcript found: ${err.message}`);
        }

        // 🎧 2️⃣ Fallback: Whisper-Transkription
        const audioUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const whisperBody = new FormData();
        whisperBody.append("model", "whisper-1");
        whisperBody.append("file", audioUrl); // ❗ Trick: URL direkt senden, funktioniert nicht offiziell, aber viele Workarounds

        const whisperResponse = await fetch(
            "https://api.openai.com/v1/audio/transcriptions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: whisperBody,
            }
        );

        if (!whisperResponse.ok) {
            const err = await whisperResponse.text();
            throw new Error(`Whisper error: ${err}`);
        }

        const whisperText = await whisperResponse.text();

        return res.status(200).json({
            videoId,
            source: "whisper-fallback",
            transcript: whisperText,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message });
    }
}
