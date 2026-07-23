import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import signup from "./api/signup.js";
import login from "./api/login.js";
import users from "./api/users.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.all("/api/signup", (req, res) => signup(req, res));
app.all("/api/login", (req, res) => login(req, res));
app.all("/api/users", (req, res) => users(req, res));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
