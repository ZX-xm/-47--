import "./styles/main.css";
import "./styles/faction-themes.css";
import { ScreenManager } from "./screens/ScreenManager";

const app = document.getElementById("app");
if (!app) {
  throw new Error("Root element #app not found");
}

const screenManager = new ScreenManager(app);
screenManager.init();
