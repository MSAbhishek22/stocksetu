/* StockSetu 3D scene — Three.js r160 (vendored, pinned).
   Reads engine state every frame; owns no simulation logic. */
import * as THREE from 'three';

const CLASS_COLORS = { A: 0x3d9970, B: 0xe0a526, C: 0x7d8ca3 };
const CLASS_CSS = { A: '#3d9970', B: '#e0a526', C: '#7d8ca3' };
const PICKER_COLORS = [0x14655a, 0xb3541e, 0x31517d];

export function createScene(canvas, engine, onZoneSelect) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe9ec);
  scene.fog = new THREE.Fog(0xdfe9ec, 80, 150);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 300);

  // ---------- lights: daylight ----------
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x8a8f7a, 0.95));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.7);
  sun.position.set(28, 40, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  sun.shadow.camera.far = 120;
  scene.add(sun);

  const lambert = (color, opts) =>
    new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}));

  // ---------- floor ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(48, 36), lambert(0xcfd0cb));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0.5);
  floor.receiveShadow = true;
  scene.add(floor);

  // painted lines: cross-aisle edges + dock hatch
  const paint = new THREE.MeshBasicMaterial({ color: 0xf2c230 });
  function paintStrip(w, d, x, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), paint);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.02, z);
    scene.add(m);
  }
  paintStrip(44, 0.35, 0, 10.4);
  paintStrip(44, 0.35, 0, 12.6);
  for (let i = 0; i < 7; i++) paintStrip(0.5, 3.4, -6.3 + i * 2.1, 14.6);

  // low cutaway walls: north + east only
  const wallMat = lambert(0xe6e1d4);
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(48, 2.4, 0.4), wallMat);
  northWall.position.set(0, 1.2, -15.8);
  scene.add(northWall);
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, 36), wallMat);
  eastWall.position.set(22.8, 1.2, 0.5);
  scene.add(eastWall);

  // ---------- racks + product boxes ----------
  const steel = lambert(0xdfe1de);
  const beamMat = lambert(0xe07b39);
  const rackGroup = new THREE.Group();
  scene.add(rackGroup);

  for (const rowX of engine.ROW_X) {
    const row = new THREE.Group();
    // uprights, both faces
    for (const sideX of [rowX - 0.95, rowX + 0.95]) {
      for (let i = 0; i < 7; i++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.1, 0.18), steel);
        post.position.set(sideX, 1.55, -12.6 + i * 3.9);
        post.castShadow = true;
        row.add(post);
      }
      // beams at two shelf levels
      for (const y of [0.85, 2.05]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 23.6), beamMat);
        beam.position.set(sideX, y, -1.1);
        row.add(beam);
      }
    }
    rackGroup.add(row);
  }

  // product cartons: one InstancedMesh, two levels per bay
  const bayCount = engine.bays.length;
  const boxGeo = new THREE.BoxGeometry(1.5, 0.8, 1.45);
  const boxMesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), bayCount * 2);
  boxMesh.castShadow = true;
  const dummy = new THREE.Object3D();
  engine.bays.forEach((bay, i) => {
    for (let level = 0; level < 2; level++) {
      dummy.position.set(bay.x, 0.5 + level * 1.2, bay.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      boxMesh.setMatrixAt(i * 2 + level, dummy.matrix);
    }
  });
  scene.add(boxMesh);

  // bay labels (canvas textures, redrawn when the layout changes)
  const labelTextures = [];
  const labelCanvases = [];
  function drawLabel(i) {
    const bay = engine.bays[i];
    const product = engine.products[bay.productId];
    const c = labelCanvases[i], ctx = c.getContext('2d');
    ctx.fillStyle = '#f7f3ea'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = CLASS_CSS[product.cls];
    ctx.fillRect(0, 0, 26, c.height);
    ctx.fillStyle = '#20242a';
    ctx.font = 'bold 25px ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(bay.code.replace(' · ', '-'), 36, c.height / 2 + 1);
    labelTextures[i].needsUpdate = true;
  }
  engine.bays.forEach((bay, i) => {
    const c = document.createElement('canvas');
    c.width = 160; c.height = 44;
    labelCanvases.push(c);
    const tex = new THREE.CanvasTexture(c);
    labelTextures.push(tex);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.47), mat);
    plane.position.set(bay.x - 1.06, 2.62, bay.z);
    plane.rotation.y = -Math.PI / 2;
    scene.add(plane);
    drawLabel(i);
  });

  function refreshLayout() {
    const color = new THREE.Color();
    engine.bays.forEach((bay, i) => {
      const product = engine.products[bay.productId];
      color.setHex(CLASS_COLORS[product.cls]);
      boxMesh.setColorAt(i * 2, color);
      color.multiplyScalar(0.82);
      boxMesh.setColorAt(i * 2 + 1, color);
      drawLabel(i);
    });
    if (boxMesh.instanceColor) boxMesh.instanceColor.needsUpdate = true;
  }
  refreshLayout();

  // ---------- zone hit boxes + highlight ----------
  const hitBoxes = [];
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  engine.ROW_X.forEach((rowX, r) => {
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.4, 24.5), hitMat);
    hit.position.set(rowX, 1.7, -1.1);
    hit.userData.row = r;
    scene.add(hit);
    hitBoxes.push(hit);
  });
  const highlight = new THREE.Mesh(
    new THREE.BoxGeometry(2.9, 3.5, 24.8),
    new THREE.MeshBasicMaterial({ color: 0x14655a, transparent: true, opacity: 0.22 }));
  highlight.visible = false;
  scene.add(highlight);

  // ---------- dock ----------
  const dock = new THREE.Group();
  const platform = new THREE.Mesh(new THREE.BoxGeometry(15, 0.3, 4.4), lambert(0xb9bcb4));
  platform.position.set(0, 0.15, 13.9);
  platform.receiveShadow = true;
  dock.add(platform);
  scene.add(dock);

  // DISPATCH sign
  (function () {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 96;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#20242a'; ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#f2c230';
    ctx.font = 'bold 56px ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DISPATCH', 256, 52);
    const tex = new THREE.CanvasTexture(c);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 1.2),
      new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(0, 2.6, 15.9);
    // plane's textured face looks south (+z), toward the viewer
    scene.add(sign);
    for (const px of [-3.4, 3.4]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 0.16), steel);
      post.position.set(px, 1.3, 15.9);
      scene.add(post);
    }
  })();

  // dock queue crates (pooled, capped at 8)
  const crateMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.85, 0.85, 0.85), lambert(0xc9a06a), 8);
  crateMesh.castShadow = true;
  scene.add(crateMesh);

  // ---------- pickers (pooled forklift-pickers) ----------
  const pickerGroups = engine.state.pickers.map((picker, i) => {
    const g = new THREE.Group();
    const bodyMat = lambert(PICKER_COLORS[i % PICKER_COLORS.length]);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.5, 1.7), bodyMat);
    body.position.y = 0.45; body.castShadow = true;
    g.add(body);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.14), lambert(0x3a3f45));
    mast.position.set(0, 1.05, 0.82);
    g.add(mast);
    const forks = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.07, 0.7), lambert(0x3a3f45));
    forks.position.set(0, 0.32, 1.15);
    g.add(forks);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), bodyMat);
    post.position.set(-0.42, 1.15, -0.6);
    g.add(post);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.9), bodyMat);
    roof.position.set(0, 1.62, -0.55);
    g.add(roof);
    const carton = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), lambert(0xc9a06a));
    carton.position.set(0, 0.72, 1.15);
    carton.castShadow = true;
    carton.name = 'carton';
    carton.visible = false;
    g.add(carton);
    scene.add(g);
    return g;
  });

  // ---------- camera orbit (own small control; drag + wheel) ----------
  const orbit = { theta: -0.62, phi: 0.92, radius: 54, target: new THREE.Vector3(0, 0, 0) };
  function applyCamera() {
    const sp = Math.sin(orbit.phi), y = Math.cos(orbit.phi);
    camera.position.set(
      orbit.target.x + orbit.radius * sp * Math.sin(orbit.theta),
      orbit.target.y + orbit.radius * y,
      orbit.target.z + orbit.radius * sp * Math.cos(orbit.theta));
    camera.lookAt(orbit.target);
  }
  applyCamera();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let dragStart = null, dragged = false;

  canvas.addEventListener('pointerdown', (e) => {
    dragStart = { x: e.clientX, y: e.clientY };
    dragged = false;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragStart) {
      // hover cursor over racks
      pointer.set((e.offsetX / canvas.clientWidth) * 2 - 1,
        -(e.offsetY / canvas.clientHeight) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      canvas.style.cursor =
        raycaster.intersectObjects(hitBoxes).length > 0 ? 'pointer' : 'grab';
      return;
    }
    const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) dragged = true;
    if (dragged) {
      orbit.theta -= dx * 0.005;
      orbit.phi = Math.min(1.3, Math.max(0.35, orbit.phi - dy * 0.004));
      dragStart = { x: e.clientX, y: e.clientY };
      applyCamera();
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    const wasDrag = dragged;
    dragStart = null; dragged = false;
    if (wasDrag) return;
    pointer.set((e.offsetX / canvas.clientWidth) * 2 - 1,
      -(e.offsetY / canvas.clientHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hitBoxes);
    onZoneSelect(hits.length > 0 ? hits[0].object.userData.row : null);
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    orbit.radius = Math.min(90, Math.max(26, orbit.radius * (1 + e.deltaY * 0.001)));
    applyCamera();
  }, { passive: false });

  // ---------- per-frame sync ----------
  const crateDummy = new THREE.Object3D();
  function sync() {
    engine.state.pickers.forEach((picker, i) => {
      const g = pickerGroups[i];
      g.position.set(picker.pos.x, 0, picker.pos.z);
      // smooth heading (shortest arc)
      let diff = picker.heading - g.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y += diff * 0.35;
      g.getObjectByName('carton').visible = picker.carrying;
    });
    const q = Math.min(engine.state.queue.length, 8);
    for (let i = 0; i < 8; i++) {
      crateDummy.position.set(-6.2 + (i % 4) * 1.05, 0.58 + Math.floor(i / 4) * 0.9, 12.9);
      crateDummy.scale.setScalar(i < q ? 1 : 0.0001);
      crateDummy.updateMatrix();
      crateMesh.setMatrixAt(i, crateDummy.matrix);
    }
    crateMesh.instanceMatrix.needsUpdate = true;
  }

  function setSelectedZone(row) {
    if (row === null || row === undefined) { highlight.visible = false; return; }
    highlight.position.set(engine.ROW_X[row], 1.75, -1.1);
    highlight.visible = true;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) ||
        canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function render() {
    resize();
    sync();
    renderer.render(scene, camera);
  }

  return { render, refreshLayout, setSelectedZone };
}
