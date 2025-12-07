// netlify/functions/getPhotos.js

const REPO = "IvanSt-ph/jek-map";
const FILE_PATH = "photos.json";

exports.handler = async () => {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return { statusCode: 500, body: "Missing GITHUB_TOKEN" };

    const api = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    };

    const res = await fetch(api, { headers });

    if (res.status === 404) {
      return { statusCode: 200, body: "{}" };
    }

    const info = await res.json();
    const raw = Buffer.from(info.content, "base64").toString("utf8");

    return { statusCode: 200, body: raw };

  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
