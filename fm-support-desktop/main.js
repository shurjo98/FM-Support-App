// FM Support desktop shell. This is a thin native wrapper: it just opens a
// window onto the hosted FM Support web app (frontend + backend on one
// Render URL), the same way a browser would. All app data lives in the
// hosted Postgres database, so every installed copy (Windows, Mac, web)
// reads and writes the same shared data — there is no local data store here.
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const bundledConfigPath = path.join(__dirname, "config.json");
const userConfigPath = path.join(app.getPath("userData"), "config.json");

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function resolveAppUrl() {
  if (process.env.FM_SUPPORT_URL) return process.env.FM_SUPPORT_URL;

  // First run: copy the bundled default config into userData so it's easy
  // to edit by hand later (e.g. pointing at a different deployment) without
  // rebuilding the installer.
  if (!fs.existsSync(userConfigPath)) {
    fs.mkdirSync(path.dirname(userConfigPath), { recursive: true });
    fs.copyFileSync(bundledConfigPath, userConfigPath);
  }

  const userConfig = readJson(userConfigPath);
  const bundledConfig = readJson(bundledConfigPath);
  return userConfig?.appUrl || bundledConfig?.appUrl || "http://localhost:4000";
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#001b30", // FM navy, matches the splash/app shell
    title: "FM Support",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open any target="_blank" links (e.g. "Call Technician" tel: links,
  // external docs) in the system browser instead of inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadURL(resolveAppUrl());
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ label: app.getName(), submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }] }] : []),
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
