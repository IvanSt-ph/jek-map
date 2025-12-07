import fetch from "node-fetch";

export async function handler() {
    const repo = "IvanSt-ph/jek-map";
    const filePath = "photos.json";
    const api = `https://api.github.com/repos/${repo}/contents/${filePath}`;

    try {
        const response = await fetch(api);
        const json = await response.json();

        if (!json.content) return { statusCode: 200, body: "{}" };

        const decoded = JSON.parse(Buffer.from(json.content, "base64").toString("utf8"));

        return {
            statusCode: 200,
            body: JSON.stringify(decoded)
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
}
