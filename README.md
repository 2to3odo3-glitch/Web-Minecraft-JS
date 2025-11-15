Web Minecraft JS
================

A simple Minecraft-like voxel world implemented in pure JavaScript and WebGL (Three.js).
这是一个用 JavaScript + WebGL（Three.js）实现的网页版“我的世界”小项目。

## Features

- [x] Infinite chunked terrain streamed in with layered Perlin noise heightmaps and beaches, snow caps, trees, and ore pockets
- [x] Expanded block palette with procedurally shaded textures（草方块、泥土、石头、沙子、砂砾、雪、原木、木板、树叶、水、煤矿石等）
- [x] First-person controls with full collision boxes, gravity, and jump physics for Survival mode
- [x] Creative mode flight toggle plus tool-based block breaking with progress bar feedback
- [x] Passive roaming mobs（小羊）that spawn around the player on solid ground
- [x] Instanced chunk meshing, hidden-face culling, and delta saves for performant rendering and compact persistence
- [x] LocalStorage save / load（自动保存 + Shift+R 手动保存）
- [x] Multilingual UI（简体中文 / 繁體中文 / English US / English UK）

## Tech Stack

- JavaScript (ES modules)
- [Three.js](https://threejs.org/)
- HTML5 / CSS

## Run locally

```bash
git clone https://github.com/2to3odo3-glitch/Web-Minecraft-JS.git
cd Web-Minecraft-JS
# 启动一个简单的静态服务器（任选其一）
npx serve .
# 或者使用 Python
python3 -m http.server 3000
```

然后在浏览器中打开 `http://localhost:3000`（或终端提示的端口），点击“开始游戏”进入指针锁定模式即可畅玩。

### Controls / 操作方式

- 鼠标移动：控制视角 / Mouse: look around
- `W A S D`：水平移动 / Move horizontally
- `Space`：跳跃（创造模式上升）/ Jump (ascend in Creative)
- `Shift`：创造模式下降 / Descend while in Creative mode
- `Ctrl`：冲刺 / Sprint in Survival mode
- 鼠标左键（长按生存模式）/ 右键：破坏 / 放置方块
- `F`：切换工具（手、木镐、木锹、木斧、剪刀）
- `V`：切换生存 / 创造模式
- 数字键 `1-9`（`0` 代表第 10 格）：切换方块类型
- `Shift + R`：手动保存（系统也会在每次修改后自动保存）
