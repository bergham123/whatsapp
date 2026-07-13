import fetch from "node-fetch";

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.OWNER;
const REPO = process.env.REPO;
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

// ===========================
// Read File
// ===========================

export async function getFile(path) {
    const res = await fetch(
        `${API}/contents/${path}`,
        {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                Accept: "application/vnd.github+json"
            }
        }
    );

    if (!res.ok) {
        throw new Error("Cannot read " + path);
    }

    const file = await res.json();
    const content = Buffer
        .from(file.content, "base64")
        .toString("utf8");

    return {
        sha: file.sha,
        data: JSON.parse(content)
    };
}

// ===========================
// Update File
// ===========================

export async function updateFile(
    path,
    json,
    message = "Update File"
) {
    const current = await getFile(path);
    const content = Buffer
        .from(
            JSON.stringify(json, null, 2)
        )
        .toString("base64");

    const res = await fetch(
        `${API}/contents/${path}`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                Accept: "application/vnd.github+json"
            },
            body: JSON.stringify({
                message,
                content,
                sha: current.sha
            })
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
    }
    return await res.json();
}

// ===========================
// Workflow
// ===========================

export async function runWorkflow(
    workflow = "send.yaml"
) {
    const res = await fetch(
        `${API}/actions/workflows/${workflow}/dispatches`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                Accept: "application/vnd.github+json"
            },
            body: JSON.stringify({
                ref: "main"
            })
        }
    );

    if (!res.ok) {
        throw new Error("Workflow Error");
    }
    return true;
}

// ===========================
// Users
// ===========================

export async function getUsers() {
    try {
        const file = await getFile("users.json");
        return file.data;
    } catch (error) {
        // If users.json doesn't exist, return empty array
        if (error.message.includes("Cannot read")) {
            return [];
        }
        throw error;
    }
}

export async function saveUsers(users) {
    return await updateFile(
        "users.json",
        users,
        "Update users"
    );
}
