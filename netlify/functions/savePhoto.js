import fetch from "node-fetch";

export async function handler(event, context) {
    try {
        const { houseId, url } = JSON.parse(event.body);

        if (!houseId || !url) {
            return { statusCode: 400, body: "Invalid input" };
        }

        const repo = "IvanSt-ph/jek-map";
        const filePath = "photos.json";
        const api = `https://api.github.com/repos/${repo}/contents/${filePath}`;

        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            return { statusCode: 500, body: "Missing GITHUB_TOKEN" };
        }

        // Получаем текущий файл
        const current = await fetch(api, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.json());

        const oldContent = current.content
            ? JSON.parse(Buffer.from(current.content, "base64").toString("utf8"))
            : {};

        if (!oldContent[houseId]) oldContent[houseId] = [];
        oldContent[houseId].push(url);

        const newContent = Buffer.from(
            JSON.stringify(oldContent, null, 2)
        ).toString("base64");

        const result = await fetch(api, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: `Added photo for ${houseId}`,
                content: newContent,
                sha: current.sha
            })
        }).then(res => res.json());

        return {
            statusCode: 200,
            body: JSON.stringify({ ok: true, saved: url })
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
}
