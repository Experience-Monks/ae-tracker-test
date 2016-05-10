require('babel-polyfill');

const css = require('dom-css');
const convert = require('./lib/ae-value');
const getAECameraData = require('./lib/ae-camera');
const createVideo = require('simple-media-element').video;
const events = require('dom-events');
const createLoop = require('raf-loop');
const createTimeline = require('keyframes');
const data = require('./out.json');

const getPBRMesh = require('./lib/getPBRMesh');

const comp = getCompositions(data)[0];

const VIDEO_WIDTH = 520;

const aeCamera = comp.layers.find(x => x.matchName === 'ADBE Camera Layer');
const positionTimeline = buildTimeline(aeCamera.properties.Transform.Position);
const orientationTimeline = buildTimeline(aeCamera.properties.Transform.Orientation);

const solids = comp.layers.filter(x => x.matchName === 'ADBE AV Layer');

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const video = createVideo('drone-footage2.mp4', {
  loop: true
});

events.once(video, 'canplay', () => {
  video.style.width = `${VIDEO_WIDTH}px`;
  document.body.appendChild(video);
  setupRenderer();
});

video.load();

function getCompositions (data) {
  return data.project.items.filter(item => item.typeName === 'Composition');
}

function setupRenderer () {
  const aspect = video.videoWidth / video.videoHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(VIDEO_WIDTH, VIDEO_WIDTH / aspect);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor('#000', 0);
  css(renderer.domElement, {
    position: 'absolute',
    top: 0,
    left: 0
  });
  document.body.appendChild(renderer.domElement);

  const cameraData = getAECameraData(comp, aeCamera);
  const camera = new THREE.PerspectiveCamera();
  camera.aspect = comp.width / comp.height;
  camera.near = 1;
  camera.far = 50000;
  camera.filmGauge = cameraData.filmSize;
  camera.setFocalLength(cameraData.focalLength);

  const scene = new THREE.Scene();
  const solidObjects = solids.map(solid => {
    const Transform = solid.properties.Transform;
    const anchor = Transform['Anchor Point'].value;
    const position = Transform['Position'].value;
    const scale = Transform['Scale'].value.map(x => x / 100);
    const orientation = Transform['Orientation'].value.map((x, i) => {
      const m = i === 2 ? 1 : -1; // XY are flipped ?
      return m * x * Math.PI / 180;
    });

    // Temp box geometry
    // const geometry = new THREE.BoxGeometry(1, 1, 1);
    // const material = new THREE.MeshBasicMaterial({
    //   color: 'white',
    //   side: THREE.DoubleSide,
    //   transparent: true,
    //   opacity: 0.75
    // });
    // const mesh = new THREE.Mesh(geometry, material);
    const mesh = new THREE.Object3D();

    const scaleVec = new THREE.Vector3().fromArray(scale);
    mesh.scale.set(solid.width, solid.height, 1);
    mesh.scale.multiply(scaleVec);
    mesh.position.fromArray(position);

    // XY is backwards in AE?
    mesh.position.x *= -1;
    mesh.position.y *= -1;

    // AE anchor (0, 0) is top left, ThreeJS is center
    mesh.position.x -= (solid.width / 2 - anchor[0]) * scale[0];
    mesh.position.y -= (solid.height / 2 - anchor[1]) * scale[1];
    mesh.position.z -= anchor[2] * scale[2];

    mesh.rotation.fromArray(orientation);
    return mesh;
  });

  // solidObjects.forEach(obj => scene.add(obj));
  render();
  const loop = createLoop(dt => {
    render();
  }).start();
  video.play();
  setupEnv();

  function render () {
    const timeStamp = video.currentTime || 0;
    const position = positionTimeline.value(timeStamp);
    camera.position.fromArray(position);
    camera.position.y *= -1;
    camera.position.x *= -1;

    const orientation = orientationTimeline.value(timeStamp);
    camera.rotation.x = -Math.PI + -orientation[0] * Math.PI / 180;
    camera.rotation.y = orientation[1] * Math.PI / 180;
    camera.rotation.z = -Math.PI + -orientation[2] * Math.PI / 180;

    renderer.render(scene, camera);
  }

  function setupEnv () {
    scene.add(new THREE.AmbientLight('#020102'));
    const dir = new THREE.DirectionalLight('#f0dfaa', 1);
    dir.position.set(-40, 60, 50);
    scene.add(dir);

    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;

    var dummies = solidObjects.map(obj => {
      // reset props for our fancy 3D Mesh
      // obj.rotation.set(0, 0, 0);
      obj.scale.set(obj.scale.x, obj.scale.x, obj.scale.x);
      return obj;
    });

    getPBRMesh({ renderer }, (err, material) => {
      if (err) throw err;
      const geometries = [
        new THREE.TorusGeometry(1, 0.25, 128, 128),
        new THREE.TorusKnotGeometry(1, 0.25, 256),
        new THREE.BoxGeometry(1, 1, 1)
      ];
      
      const meshes = dummies.map((dummy, i) => {
        const geometry = geometries[i % geometries.length];
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.multiplyScalar(0.35);
        dummy.add(mesh);
        scene.add(dummy);
        return mesh;
      });
      loop.on('tick', dt => {
        meshes.forEach((instance, i) => {
          instance.rotation.z += dt / 1000 * -0.15;
          // instance.rotation.x += dt / 1000;
        });
      });
    });
  }
}

function buildTimeline (node) {
  return createTimeline(node.keyframes.map(d => {
    return {
      time: d[0],
      value: d[1]
    };
  }));
}
