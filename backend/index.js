const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const cheerio = require('cheerio');



const app = express();
app.use(cors());
app.use(bodyParser.json());

const stopWords = new Set([
    "the", "of", "and", "a", "to", "in", "is", "you", "that", "it", "he", 
    "was", "for", "on", "are", "with", "as", "I", "his", "they", "be", 
    "at", "one", "have", "this", "from", "or", "had", "by", "not", 
    "word", "but", "what", "some", "we", "can", "out", "other", "were", 
    "all", "there", "when", "up", "use", "your", "how", "said", "an", 
    "each", "she"
]);

function cleanAndFilterWords(text) {
    const wordCounts = {};
    const words = text.toLowerCase().replace(/[^a-zA-Z\s]/g, "").split(/\s+/);

    words.forEach(word => {
        if (word && !stopWords.has(word)) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
    });

    return Object.entries(wordCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);
}

async function fetchTextContent(url) {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    return $("body").text();
}

async function fetchTopWordsUsingGemini(text) {
    try {
        const geminiResponse = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyBWI2XGzitTai1ysOgKhmPKwtVun2sYqTk', {
            text: text,
        }, {
            headers: { 'Authorization': 'Bearer AIzaSyBWI2XGzitTai1ysOgKhmPKwtVun2sYqTk' }
        });

        return geminiResponse.data;  // Adjust based on Gemini's response format
    } catch (error) {
        console.error("Gemini API error:", error);
        throw new Error("Gemini API failed.");
    }
}

app.post('/fetch-words', async (req, res) => {
    const { url } = req.body;

    try {
        const text = await fetchTextContent(url);

        try {
            // Attempt Gemini API first
            const geminiResult = await fetchTopWordsUsingGemini(text);
            res.json({ method: "Gemini API", data: geminiResult });
        } catch (apiError) {
            console.warn("Gemini API failed, using fallback.");
            // Fallback to local word frequency calculation
            const fallbackResult = cleanAndFilterWords(text);
            res.json({ method: "Fallback", data: fallbackResult });
        }

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch or process the page content.' });
    }
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
