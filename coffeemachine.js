"use strict";

const canvas = document.getElementById("gl-canvas");
const gl = canvas.getContext("webgl2");
if (!gl) alert("WebGL2 required");

let program = null;

// hex → [0..1, 0..1, 0..1]
function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

window.onload = main;

function main() {
  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  // ---------------- Geometry Arrays ----------------
  const verts = [], colors = [], normals = [], texCoords = [];

  // ---------------- Builders ----------------
  function addFace(v1, v2, v3, v4, normal, color) {
    const c = color.slice(0, 3);
    verts.push(...v1, ...v2, ...v3, ...v1, ...v3, ...v4);
    for (let i = 0; i < 6; ++i) { normals.push(...normal); colors.push(...c); }
    texCoords.push(0,0, 1,0, 1,1, 0,0, 1,1, 0,1);
  }

  function addBox(minX, maxX, minY, maxY, minZ, maxZ, color) {
    const p = [
      [minX, minY, maxZ], [maxX, minY, maxZ], [maxX, maxY, maxZ], [minX, maxY, maxZ],
      [minX, minY, minZ], [minX, maxY, minZ], [maxX, maxY, minZ], [maxX, minY, minZ]
    ];
    addFace(p[0], p[1], p[2], p[3], [0, 0, 1], color);   // Front
    addFace(p[7], p[6], p[5], p[4], [0, 0, -1], color);  // Back
    addFace(p[1], p[7], p[6], p[2], [1, 0, 0], color);   // Right
    addFace(p[4], p[0], p[3], p[5], [-1, 0, 0], color);  // Left
    addFace(p[3], p[2], p[6], p[5], [0, 1, 0], color);   // Top
    addFace(p[0], p[4], p[7], p[1], [0, -1, 0], color);  // Bottom
  }

  // ---------------- Build model & record ranges ----------------

  // Stand first (INDIVIDUAL object — sibling of machine)
  const standStart = 0;
  addBox(-0.45, 0.45, -1.4, -0.2, -0.30, 0.30, [0.45, 0.28, 0.10, 1.0]);
  const standCount = (verts.length / 3) - standStart;

  // Machine next (PARENT)
  const machineStart = verts.length / 3;
  addBox(-0.4, 0.4, -0.2, 1.0, -0.25, 0.25, [0.12, 0.12, 0.12, 1.0]);      // body
  addBox(-0.42, 0.42, 1.0, 1.08, -0.28, 0.28, [0.60, 0.60, 0.60, 1.0]);    // top
  addBox(0.15, 0.38, 0.15, 0.75, -0.24, 0.24, [0.02, 0.02, 0.02, 1.0]);    // side housing
  addBox(0.175, 0.355, 0.45, 0.62, -0.235, 0.235, [0.10, 0.40, 0.90, 1.0]); // panel
  addBox(-0.1, 0.1, 0.8, 0.95, -0.255, 0.255, [0.95, 0.75, 0.08, 1.0]);    // emblem
  addBox(-0.18, 0.18, -0.05, 0.35, 0.25, 0.50, [0.07, 0.07, 0.07, 1.0]);    // front column
  addBox(-0.16, 0.16, -0.12, 0.05, 0.40, 0.45, [0.70, 0.70, 0.70, 1.0]);    // nozzle block
  addBox(-0.12, 0.12, -0.14, -0.06, 0.30, 0.40, [0.20, 0.20, 0.20, 1.0]);   // tray
  for (let i = 0; i < 4; i++) {
    const y0 = 0.5 - i * 0.12;
    addBox(-0.38, -0.25, y0 - 0.03, y0 + 0.03, -0.235, -0.23, [0.85, 0.85, 0.85, 1.0]); // vents
  }
  addBox(-0.5, 0.5, -0.3, -0.2, -0.3, 0.3, [0.95, 0.75, 0.08, 1.0]); // base trim
  const machineCount = (verts.length / 3) - machineStart;

  // Coffee (CHILD of machine)
  const coffeeStart = verts.length / 3;
  addBox(-0.03, 0.03, -0.25, 0.10, 0.38, 0.44, [0.25, 0.12, 0.02, 1.0]);
  const coffeeCount = (verts.length / 3) - coffeeStart;

  // Cup (CHILD of machine) — D plastic black w/ yellow + white rim, no lid
  const cupStart = verts.length / 3;
  addBox(-0.12, 0.12, -0.35, -0.10, 0.36, 0.46, [0.00, 0.00, 0.00, 1.0]); // black body
  addBox(-0.13, 0.13, -0.10, -0.05, 0.35, 0.47, [1.00, 0.90, 0.15, 1.0]); // yellow rim
  addBox(-0.135, 0.135, -0.05, -0.03, 0.345, 0.475, [0.95, 0.95, 0.95, 1.0]); // white rim
  const cupCount = (verts.length / 3) - cupStart;

  // ---------------- Buffers ----------------
  function setupBuffer(data, name, size) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }
  setupBuffer(verts, "aPosition", 3);
  setupBuffer(colors, "aColor", 3);
  setupBuffer(normals, "aNormal", 3);
  setupBuffer(texCoords, "aTexCoord", 2);

  // ---------------- Textures ----------------
  function createCheckerTexture(size = 64, squares = 8) {
    const pixels = new Uint8Array(size * size * 3);
    const step = size / squares;
    for (let y = 0; y < size; ++y) {
      for (let x = 0; x < size; ++x) {
        const i = (y * size + x) * 3;
        const v = ((Math.floor(y / step) + Math.floor(x / step)) % 2 === 0) ? 255 : 0;
        pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
      }
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, size, size, 0, gl.RGB, gl.UNSIGNED_BYTE, pixels);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  let imageReady = false;
  function loadImageTexture(url) {
    const tex = gl.createTexture();
    const img = new Image();
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      imageReady = true;
    };
    img.src = url;
    return tex;
  }

  const checkerTex = createCheckerTexture();
  const imageTex = loadImageTexture("images.webp");
  let useImageTex = true;

  // ---------------- Uniform Locations ----------------
  const uMV  = gl.getUniformLocation(program, "uModelViewMatrix");
  const uPrj = gl.getUniformLocation(program, "uProjectionMatrix");
  const uNM  = gl.getUniformLocation(program, "uNormalMatrix");
  const uLightPos = gl.getUniformLocation(program, "uLightPosition");
  const uAmb = gl.getUniformLocation(program, "uAmbientColor");
  const uDif = gl.getUniformLocation(program, "uDiffuseColor");
  const uSpec = gl.getUniformLocation(program, "uSpecularColor");
  const uTex = gl.getUniformLocation(program, "uTexture");
  const uUseTex = gl.getUniformLocation(program, "uUseTexture");

  // ---------------- UI & Controls ----------------
  document.getElementById("useImageTex")?.addEventListener("change", e => {
    useImageTex = e.target.checked;
  });

  let theta = { x: 20, y: -20, z: 0 };
  let scaleValue = 1.0;
  let translation = { x: 0, y: 0, z: 0 };
  let camera = { x: 0, y: 2, z: 5 };
  let projection = { type: "perspective", fovy: 45 };
  let orthoHalfX = 3, orthoHalfY = 3;

  let light = { x: 3, y: 4, z: 4, ambient: "#202020", diffuse: "#ffffff", specular: "#ffffff" };

  // root transforms
  document.getElementById("rx").addEventListener("input", e => theta.x = parseFloat(e.target.value));
  document.getElementById("ry").addEventListener("input", e => theta.y = parseFloat(e.target.value));
  document.getElementById("rz").addEventListener("input", e => theta.z = parseFloat(e.target.value));
  document.getElementById("scale").addEventListener("input", e => scaleValue = parseFloat(e.target.value));
  document.getElementById("ty").addEventListener("input", e => translation.y = parseFloat(e.target.value));
  document.getElementById("camX").addEventListener("input", e => camera.x = parseFloat(e.target.value));
  document.getElementById("camY").addEventListener("input", e => camera.y = parseFloat(e.target.value));
  document.getElementById("camZ").addEventListener("input", e => camera.z = parseFloat(e.target.value));
  document.getElementById("projType")?.addEventListener("change", e => projection.type = e.target.value);
  document.getElementById("fovy")?.addEventListener("input", e => projection.fovy = parseFloat(e.target.value));

  document.getElementById("lightX").addEventListener("input", e => light.x = parseFloat(e.target.value));
  document.getElementById("lightY").addEventListener("input", e => light.y = parseFloat(e.target.value));
  document.getElementById("lightZ").addEventListener("input", e => light.z = parseFloat(e.target.value));
  document.getElementById("ambientColor").addEventListener("input", e => light.ambient = e.target.value);
  document.getElementById("diffuseColor").addEventListener("input", e => light.diffuse = e.target.value);
  document.getElementById("specularColor").addEventListener("input", e => light.specular = e.target.value);

  // hierarchy controls
  const standT = { x: 0, y: 0, z: 0 };
  const machT  = { x: 0, y: 0, z: 0 };
  const cupT   = { x: 0, y: -0.20, z: 0 }; // default below nozzle

  // Stand sliders
  document.getElementById("standX").addEventListener("input", e => standT.x = parseFloat(e.target.value));
  document.getElementById("standY").addEventListener("input", e => standT.y = parseFloat(e.target.value));
  document.getElementById("standZ").addEventListener("input", e => standT.z = parseFloat(e.target.value));
  // Machine sliders
  document.getElementById("machX").addEventListener("input", e => machT.x = parseFloat(e.target.value));
  document.getElementById("machY").addEventListener("input", e => machT.y = parseFloat(e.target.value));
  document.getElementById("machZ").addEventListener("input", e => machT.z = parseFloat(e.target.value));
  // Cup sliders (child)
  document.getElementById("cupX").addEventListener("input", e => cupT.x = parseFloat(e.target.value));
  document.getElementById("cupY").addEventListener("input", e => cupT.y = parseFloat(e.target.value));
  document.getElementById("cupZ").addEventListener("input", e => cupT.z = parseFloat(e.target.value));

  // ---------------- Animation Loop ----------------
  let autoRotate = false;
  document.getElementById("toggle-anim").addEventListener("click", () => autoRotate = !autoRotate);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.95, 0.95, 0.95, 1.0);

  let lastTime = 0;
  let coffeeTime = 0;

  function animate(time) {
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    if (autoRotate) theta.y = (theta.y + 20 * dt) % 360;
    coffeeTime += dt * 1.0; // fall speed
    render();
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // ---------------- Render ----------------
  function render() {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Root (scene) transform
    const root = mult(
      translate(translation.x, translation.y, translation.z),
      mult(rotateY(theta.y),
      mult(rotateX(theta.x),
      mult(rotateZ(theta.z), scale(scaleValue, scaleValue, scaleValue))))
    );

    // View/Projection
    const eye = vec3(camera.x, camera.y, camera.z);
    const V = lookAt(eye, vec3(0, 0, 0), vec3(0, 1, 0));
    const aspect = gl.canvas.width / gl.canvas.height;
    const P = (projection.type === "perspective")
      ? perspective(projection.fovy ?? 45, aspect, 0.1, 100.0)
      : ortho(-3 * aspect, 3 * aspect, -3, 3, -100, 100);

    // Lighting uniforms (view space)
    const lightEye = mult(V, vec4(light.x, light.y, light.z, 1.0));
    gl.uniform4fv(uLightPos, flatten(lightEye));
    gl.uniform3fv(uAmb, hexToRgb(light.ambient));
    gl.uniform3fv(uDif, hexToRgb(light.diffuse));
    gl.uniform3fv(uSpec, hexToRgb(light.specular));

    // Texture select (guard image readiness)
    const useTex = useImageTex && imageReady;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, useTex ? imageTex : checkerTex);
    gl.uniform1i(uTex, 0);
    gl.uniform1i(uUseTex, useTex ? 1 : 0);

    // ---------- DRAW: STAND (independent object) ----------
      const M_stand = mult(root, translate(standT.x, standT.y, standT.z));
      const MV_stand = mult(V, M_stand);
      gl.uniformMatrix4fv(uMV, false, flatten(MV_stand));
      gl.uniformMatrix4fv(uPrj, false, flatten(P));
      gl.uniformMatrix3fv(uNM, false, flatten(normalMatrix(MV_stand, true)));
      gl.drawArrays(gl.TRIANGLES, standStart, standCount);

    // ---------- DRAW: MACHINE (parent) ----------
    const M_mach = mult(M_stand, translate(machT.x, machT.y, machT.z));
    const MV_mach = mult(V, M_mach);
    gl.uniformMatrix4fv(uMV, false, flatten(MV_mach));
    gl.uniformMatrix3fv(uNM, false, flatten(normalMatrix(MV_mach, true)));
    gl.drawArrays(gl.TRIANGLES, machineStart, machineCount);

    // ---------- DRAW: COFFEE (child of machine, animated down) ----------
    const fallDistance = 0.2;
    const dropY = -(coffeeTime % fallDistance);
    const M_coffee = mult(M_mach, translate(0.0, dropY, 0.0));
    const MV_coffee = mult(V, M_coffee);
    gl.uniformMatrix4fv(uMV, false, flatten(MV_coffee));
    gl.uniformMatrix3fv(uNM, false, flatten(normalMatrix(MV_coffee, true)));
    gl.drawArrays(gl.TRIANGLES, coffeeStart, coffeeCount);

    // ---------- DRAW: CUP (child of machine, slider offset) ----------
    const M_cup = mult(M_mach, translate(cupT.x, cupT.y, cupT.z));
    const MV_cup = mult(V, M_cup);
    gl.uniformMatrix4fv(uMV, false, flatten(MV_cup));
    gl.uniformMatrix3fv(uNM, false, flatten(normalMatrix(MV_cup, true)));
    gl.drawArrays(gl.TRIANGLES, cupStart, cupCount);
  }
}
