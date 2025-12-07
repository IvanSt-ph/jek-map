// netlify/functions/savePhoto.js

const REPO = "IvanSt-ph/jek-map";   // твой репозиторий
const FILE_PATH = "photos.json";    // файл с привязкой дом → список URL

exports.handler = async (event) => {
  try {
    // Разрешаем только POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed"
      };
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return {
        statusCode: 500,
        body: "Missing GITHUB_TOKEN env var"
      };
    }

    // Читаем тело запроса
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        body: "Invalid JSON body"
      };
    }

    const { houseId, url } = payload;

    if (!houseId || !url) {
      return {
        statusCode: 400,
        body: "houseId and url are required"
      };
    }

    const api = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };

    // 1) Пытаемся получить текущий photos.json
    const getRes = await fetch(api, { headers });

    let contentJson = {};
    let sha = undefined;

    if (getRes.status === 200) {
      const current = await getRes.json();
      sha = current.sha;

      if (current.content) {
        const decoded = Buffer
          .from(current.content, "base64")
          .toString("utf8");

        try {
          contentJson = JSON.parse(decoded || "{}");
        } catch {
          contentJson = {};
        }
      }
    } else if (getRes.status === 404) {
      // файла ещё нет — создадим с нуля
      contentJson = {};
    } else {
      const text = await getRes.text();
      return {
        statusCode: getRes.status,
        body: `GitHub GET error: ${text}`
      };
    }

    // 2) Добавляем фото для нужного дома
    if (!contentJson[houseId]) contentJson[houseId] = [];
    contentJson[houseId].push(url);

    // 3) Кодируем обратно в base64
    const newContentBase64 = Buffer
      .from(JSON.stringify(contentJson, null, 2))
      .toString("base64");

    // 4) Отправляем PUT в GitHub
    const putRes = await fetch(api, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `Add photo for house ${houseId}`,
        content: newContentBase64,
        // sha только если файл был
        ...(sha ? { sha } : {})
      })
    });

    if (!putRes.ok) {
      const text = await putRes.text();
      return {
        statusCode: putRes.status,
        body: `GitHub PUT error: ${text}`
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: `Server error: ${e.message}`
    };
  }
};
