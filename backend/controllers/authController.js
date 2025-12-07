import axios from "axios";
import User from "../models/User.js";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const toBase64Url = (buffer) =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

export const airtablelogin = (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  const codeVerifier = toBase64Url(crypto.randomBytes(64)).slice(0, 128);
  req.session.oauthPkceVerifier = codeVerifier;
  const codeChallenge = toBase64Url(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );

  const isProd = process.env.NODE_ENV === "production";
  const redirectUri =
    process.env.AIRTABLE_REDIRECT_URI ||
    (isProd
      ? "https://airtable-assignment-j0jc.onrender.com/api/auth/airtable/callback"
      : "http://localhost:5000/api/auth/airtable/callback");

  const scope = "schema.bases:read data.records:write data.records:read";

  const query = new URLSearchParams({
    client_id: process.env.AIRTABLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();

  const authUrl = `https://airtable.com/oauth2/v1/authorize?${query}`;

  req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);
      return res.status(500).send("Could not save session");
    }
    res.redirect(authUrl);
  });
};

export const callback = async (req, res) => {
  try {
    if (req.query.error) {
      console.error("OAuth error:", req.query);
      return res
        .status(400)
        .send(`OAuth error: ${req.query.error_description || req.query.error}`);
    }

    const { code, state } = req.query;

    if (!state || state !== req.session.oauthState) {
      console.error("Invalid or missing state", { received: state });
      return res.status(400).send("Invalid OAuth state");
    }
    delete req.session.oauthState;

    if (!code) {
      console.error("Missing authorization code");
      return res.status(400).send("Missing authorization code");
    }

    const codeVerifier = req.session.oauthPkceVerifier;
    if (!codeVerifier) {
      console.error("Missing PKCE verifier in session");
      return res.status(400).send("Missing PKCE verifier");
    }
    delete req.session.oauthPkceVerifier;

    if (
      !process.env.AIRTABLE_CLIENT_ID ||
      !process.env.AIRTABLE_CLIENT_SECRET
    ) {
      console.error("Missing Airtable OAuth env vars");
      return res
        .status(500)
        .send("Server misconfigured: missing OAuth env vars");
    }

    const tokenUrl = "https://airtable.com/oauth2/v1/token";

    const paramsBasic = new URLSearchParams();
    paramsBasic.append("grant_type", "authorization_code");
    paramsBasic.append("code", code);
    paramsBasic.append(
      "redirect_uri",
      process.env.AIRTABLE_REDIRECT_URI ||
        (process.env.NODE_ENV === "production"
          ? "https://airtable-assignment-j0jc.onrender.com/api/auth/airtable/callback"
          : "http://localhost:5000/api/auth/airtable/callback")
    );
    paramsBasic.append("code_verifier", codeVerifier);

    const basicAuth = Buffer.from(
      `${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`
    ).toString("base64");

    let tokenRes;
    try {
      tokenRes = await axios.post(tokenUrl, paramsBasic.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
      });
    } catch (err) {
      const data = err.response?.data;
      const status = err.response?.status;
      if (
        status &&
        [400, 401].includes(status) &&
        (data?.error === "invalid_client" ||
          data?.error === "unauthorized_client")
      ) {
        const paramsBody = new URLSearchParams();
        paramsBody.append("grant_type", "authorization_code");
        paramsBody.append("code", code);
        paramsBody.append("client_id", process.env.AIRTABLE_CLIENT_ID);
        paramsBody.append("client_secret", process.env.AIRTABLE_CLIENT_SECRET);
        paramsBody.append(
          "redirect_uri",
          process.env.AIRTABLE_REDIRECT_URI ||
            (process.env.NODE_ENV === "production"
              ? "https://airtable-assignment-j0jc.onrender.com/api/auth/airtable/callback"
              : "http://localhost:5000/api/auth/airtable/callback")
        );
        paramsBody.append("code_verifier", codeVerifier);

        tokenRes = await axios.post(tokenUrl, paramsBody.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      } else {
        throw err;
      }
    }

    const { access_token, refresh_token } = tokenRes.data;

    const meRes = await axios.get("https://api.airtable.com/v0/meta/whoami", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { id, email, name } = meRes.data;

    const user = await User.findOneAndUpdate(
      { airtableUserId: id },
      {
        airtableUserId: id,
        email,
        name,
        accessToken: access_token,
        refreshToken: refresh_token,
      },
      { upsert: true, new: true }
    );

    req.session.userId = user._id;

    req.session.save((err) => {
      if (err) {
        console.error("Failed to save session:", err);
        return res.status(500).send("Failed to save session");
      }
      res.redirect("airtable-assignment-6kcjvfi1f-ayeshas-projects-17feed8e.vercel.app/dashboard");
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("OAuth callback failed");
  }
};

export const me = async (req, res) => {
  if (!req.session.userId)
    return res.status(401).json({ message: "Not logged in" });
  const user = await User.findById(req.session.userId);
  res.json(user);
};
