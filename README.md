Web Minecraft JS
================

A simple Minecraft-like voxel world implemented in pure JavaScript and WebGL (Three.js).
这是一个用 JavaScript + WebGL（Three.js）实现的网页版“我的世界”小项目。

## Features

- [x] Basic 3D world with block terrain generation
- [x] First-person camera（WASD 移动 + 鼠标视角）
- [x] Break and place blocks（左键破坏 / 右键放置）
- [x] Multiple block types（草方块、泥土、石头）
- [x] Simple save / load with localStorage（自动保存 + Shift+R 手动保存）
- [x] Chunk-based world rendering with instanced meshes for better performance
- [x] Basic lighting and skybox
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

- 鼠标移动：控制视角
- `W A S D`：水平移动
- `Space` / `Shift`：上升 / 下降
- 鼠标左键 / 右键：破坏 / 放置方块
- 数字键 `1-3`：切换方块类型
- `Shift + R`：手动保存（系统也会在每次修改后自动保存）
