import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import signup from "./api/signup.js";
import login from "./api/login.js";
import users from "./api/users.js";
import threads from "./api/threads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

function wrap(fn) {
  return (req, res) => Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
}

app.all("/api/signup", wrap(signup));
app.all("/api/login", wrap(login));
app.all("/api/users", wrap(users));
app.all("/api/threads", wrap(threads));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
