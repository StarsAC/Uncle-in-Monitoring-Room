const STORAGE_KEY = "stream-monitor-json";
const STORAGE_META_KEY = "stream-monitor-meta";

const treeWrap = document.getElementById("treeWrap");
const playerGrid = document.getElementById("playerGrid");
const currentTitle = document.getElementById("currentTitle");
const currentDesc = document.getElementById("currentDesc");
const sourceStatus = document.getElementById("sourceStatus");
const streamStatus = document.getElementById("streamStatus");
const fileInput = document.getElementById("fileInput");
const clearBtn = document.getElementById("clearBtn");
const fileStatus = document.getElementById("fileStatus");
const storageStatus = document.getElementById("storageStatus");

let dataSource = {};
let selectedPath = "";
let currentPlayers = [];
const expandedNodes = new Set();

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStreamLeaf(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  const values = Object.values(value);
  return values.length > 0 && values.every((item) => typeof item === "string");
}

function initializeExpandedNodes(data) {
  expandedNodes.clear();

  if (!isPlainObject(data)) {
    return;
  }

  Object.keys(data).forEach((key) => {
    expandedNodes.add(key);
  });
}

function setFileStatus(name) {
  fileStatus.innerHTML = "<strong>值班表：</strong><span>" + name + "</span>";
}

function setStorageStatus(text) {
  storageStatus.innerHTML = "<strong>记性：</strong><span>" + text + "</span>";
}

function destroyPlayers() {
  currentPlayers.forEach((player) => {
    if (player.hls) {
      player.hls.destroy();
    }

    if (player.video) {
      player.video.pause();
      player.video.removeAttribute("src");
      player.video.load();
    }
  });

  currentPlayers = [];
}

function updateStreamStatus(count) {
  streamStatus.textContent = "盯梢画面：" + count + " 路";
}

function createEmptyState(title, message) {
  const empty = document.createElement("div");
  empty.className = "empty-card";
  empty.innerHTML = "<div><strong>" + title + "</strong><div>" + message + "</div></div>";
  return empty;
}

function renderPlayers(label, streams) {
  destroyPlayers();
  playerGrid.innerHTML = "";

  const entries = Object.entries(streams);
  updateStreamStatus(entries.length);
  currentTitle.textContent = label;
  currentDesc.textContent = "大爷已经盯上这间屋，当前看着 " + entries.length + " 路画面。";

  if (entries.length === 0) {
    playerGrid.appendChild(createEmptyState("这间屋今天没动静", "这个节点下没有可播放的视频地址。"));
    return;
  }

  entries.slice(0, 4).forEach(([name, url]) => {
    const card = document.createElement("section");
    card.className = "player-card";

    const header = document.createElement("header");
    const title = document.createElement("div");
    title.className = "player-name";
    title.textContent = name;

    const urlText = document.createElement("div");
    urlText.className = "player-url";
    urlText.title = url;
    urlText.textContent = url;

    header.append(title, urlText);

    const video = document.createElement("video");
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    const message = document.createElement("div");
    message.className = "player-message";
    message.textContent = "大爷正在接通画面...";

    card.append(header, video, message);
    playerGrid.appendChild(card);

    attachStream(video, url, message);
  });

  for (let i = entries.length; i < 4; i += 1) {
    playerGrid.appendChild(createEmptyState("空位留着", "这一格先空着。"));
  }
}

function attachStream(video, url, messageNode) {
  const hideMessage = () => {
    messageNode.style.display = "none";
  };

  const showError = (text) => {
    messageNode.style.display = "grid";
    messageNode.textContent = text;
  };

  video.addEventListener("loadedmetadata", hideMessage, { once: true });
  video.addEventListener("playing", hideMessage, { once: true });
  video.addEventListener("error", () => {
    showError("这路画面没接上，请检查流地址或浏览器支持。");
  });

  const canUseNative = video.canPlayType("application/vnd.apple.mpegurl");
  if (canUseNative) {
    video.src = url;
    video.play().catch(() => {
      showError("浏览器拦住了自动播放，请手动点一下。");
    });
    currentPlayers.push({ video });
    return;
  }

  if (window.Hls && window.Hls.isSupported()) {
    const hls = new window.Hls({
      enableWorker: true,
      lowLatencyMode: true
    });
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {
        showError("流已经连上了，请手动点一下播放。");
      });
    });
    hls.on(window.Hls.Events.ERROR, (_, data) => {
      if (data && data.fatal) {
        showError("HLS 没跑起来，请确认视频流可访问。");
      }
    });
    currentPlayers.push({ video, hls });
    return;
  }

  showError("这个浏览器不太配合，建议换一个支持 HLS 的。");
  currentPlayers.push({ video });
}

function selectLeaf(path, label, streams) {
  selectedPath = path;
  renderTree();
  renderPlayers(label, streams);
}

function createTreeNode(key, value, path, depth) {
  const item = document.createElement("li");
  item.className = "tree-item";

  if (isStreamLeaf(value)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tree-row leaf" + (selectedPath === path ? " active" : "");
    button.innerHTML =
      "<span class='stream-count'>" + Object.keys(value).length + " 路</span>" +
      "<span class='node-label'>" + key + "</span>";
    button.addEventListener("click", () => selectLeaf(path, key, value));
    item.appendChild(button);
    return item;
  }

  const expanded = expandedNodes.has(path);

  const row = document.createElement("div");
  row.className = "tree-row branch";
  row.innerHTML =
    "<span class='caret'>" + (expanded ? "▼" : "▶") + "</span>" +
    "<span class='node-label'>" + key + "</span>";
  row.addEventListener("click", () => {
    if (expandedNodes.has(path)) {
      expandedNodes.delete(path);
    } else {
      expandedNodes.add(path);
    }
    renderTree();
  });
  item.appendChild(row);

  if (expanded) {
    const subList = document.createElement("ul");
    Object.entries(value).forEach(([childKey, childValue]) => {
      const childPath = path ? path + "/" + childKey : childKey;
      subList.appendChild(createTreeNode(childKey, childValue, childPath, depth + 1));
    });
    item.appendChild(subList);
  }

  return item;
}

function renderTree() {
  treeWrap.innerHTML = "";

  if (!isPlainObject(dataSource) || Object.keys(dataSource).length === 0) {
    treeWrap.innerHTML = "<div class='empty-tree'>先把值班表交给大爷。</div>";
    return;
  }

  const root = document.createElement("ul");
  root.className = "tree-root";

  Object.entries(dataSource).forEach(([key, value]) => {
    root.appendChild(createTreeNode(key, value, key, 0));
  });

  treeWrap.appendChild(root);
}

function resetPlaybackState(titleText, descText, emptyTitle, emptyMessage) {
  destroyPlayers();
  playerGrid.innerHTML = "";
  playerGrid.appendChild(createEmptyState(emptyTitle, emptyMessage));
  currentTitle.textContent = titleText;
  currentDesc.textContent = descText;
  updateStreamStatus(0);
  selectedPath = "";
}

function saveToLocal(data, sourceLabel) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
    sourceLabel,
    savedAt: new Date().toLocaleString()
  }));
}

function applyData(data, sourceLabel, options = {}) {
  if (!isPlainObject(data) || Object.keys(data).length === 0) {
    throw new Error("JSON 顶层必须是非空对象。");
  }

  dataSource = data;
  initializeExpandedNodes(data);
  sourceStatus.textContent = "值班来源：" + sourceLabel;
  renderTree();
  resetPlaybackState(
    "监控室已通电",
    "左边点房间，右边看画面。",
    "等你点名",
    "从左侧选一个最里层节点。"
  );

  setFileStatus(sourceLabel);

  if (!options.skipPersist) {
    saveToLocal(data, sourceLabel);
    setStorageStatus("已经记住");
  } else {
    setStorageStatus("上次的安排还记得");
  }
}

function clearStoredData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_META_KEY);
  dataSource = {};
  expandedNodes.clear();
  renderTree();
  sourceStatus.textContent = "值班来源：未加载";
  setFileStatus("还没收到");
  setStorageStatus("暂时没记住");
  resetPlaybackState(
    "监控室今天还没开张",
    "先把配置交给大爷。",
    "请上传配置",
    ""
  );
}

function restoreFromLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    clearStoredData();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const meta = JSON.parse(localStorage.getItem(STORAGE_META_KEY) || "{}");
    const sourceLabel = meta.sourceLabel || "大爷上次记下的值班表";
    applyData(parsed, sourceLabel, { skipPersist: true });
  } catch (error) {
    clearStoredData();
  }
}

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    applyData(parsed, file.name);
  } catch (error) {
    alert("大爷没看懂这份 JSON：" + error.message);
  } finally {
    fileInput.value = "";
  }
});

clearBtn.addEventListener("click", () => {
  clearStoredData();
});

restoreFromLocal();
