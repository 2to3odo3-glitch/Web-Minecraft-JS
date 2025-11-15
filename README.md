Web Minecraft JS

A simple Minecraft-like voxel world implemented in pure JavaScript and WebGL (Three.js).  
这是一个用 JavaScript + WebGL（Three.js）实现的网页版“我的世界”小项目。

Features (planned)

- [x] Basic 3D world with block floor
- [x] First-person camera (WASD + mouse look)
- [ ] Break and place blocks
- [ ] Multiple block types (grass, dirt, stone...)
- [ ] Simple save / load with localStorage
- [ ] Chunk-based world rendering
- [ ] Basic lighting and skybox

Tech Stack

- JavaScript (ES modules)
- [Three.js](https://threejs.org/)
- HTML5 / CSS

Run locally

```bash
git clone https://github.com/2to3odo3-glitch/Web-Minecraft-JS.git
cd web-mc-js
# Install a simple static server (optional)
npm install -g serve
serve .
