// netlify/functions/savePhoto.js

const REPO = "IvanSt-ph/jek-map";
const FILE_PATH = "photos.json";

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return { statusCode: 500, body: "Missing GITHUB_TOKEN env var" };
    }

    const body = JSON.parse(event.body || "{}");
    const { houseId, url } = body;

    if (!houseId || !url) {
      return { statusCode: 400, body: "houseId and url are required" };
    }

    const api = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    };

    // ---- Чтение текущего photos.json ----
    const getRes = await fetch(api, { headers });

    let data = {};
    let sha = null;

    if (getRes.status === 200) {
      const info = await getRes.json();
      sha = info.sha;

      const decoded = Buffer.from(info.content, "base64").toString("utf8");
      data = JSON.parse(decoded || "{}");
    }

    // ---- Добавляем фото ----
    if (!data[houseId]) data[houseId] = [];
    data[houseId].push(url);

    const newContent = Buffer
      .from(JSON.stringify(data, null, 2))
      .toString("base64");

    // ---- Сохраняем на GitHub ----
    const putRes = await fetch(api, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `Add photo for house ${houseId}`,
        content: newContent,
        ...(sha ? { sha } : {})
      })
    });

    if (!putRes.ok) {
      return { statusCode: 500, body: await putRes.text() };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
