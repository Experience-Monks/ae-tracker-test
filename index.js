require('babel-polyfill');
global.THREE = require('three');

const css = require('dom-css');
const convert = require('./lib/ae-value');
const getAECameraData = require('./lib/ae-camera');
const createVideo = require('simple-media-element').video;
const events = require('dom-events');
const createLoop = require('raf-loop');
const timeline = require('keyframes')();
const data = require('./out.json');

const comp = getCompositions(data)[0];

const VIDEO_WIDTH = 520;

const aeCamera = comp.layers.find(x => x.matchName === 'ADBE Camera Layer');
const keyframeData = aeCamera.properties.Transform.Position.keyframes;
const keyframes = keyframeData.map(x => {
  return {
    time: x[0],
    value: x[1]
  };
});

keyframes.forEach(frame => timeline.add(frame));

const solids = comp.layers.filter(x => x.matchName === 'ADBE AV Layer');

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const video = createVideo('trim-output.mp4', {
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
  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(VIDEO_WIDTH, VIDEO_WIDTH / aspect);
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
  camera.setLens(cameraData.focalLength, cameraData.filmWidth);

  const distance = convert.millimeterToPixel(cameraData.zoom);

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

    const geometry = new THREE.BoxGeometry(1, 1);
    // geometry.applyMatrix(new THREE.Matrix4().makeTranslation(-solid.width/4, -solid.height/4, 0))

    const material = new THREE.MeshBasicMaterial({ color: 'red', side: THREE.DoubleSide });

    const mesh = new THREE.Mesh(geometry, material);
    const anchorObject = new THREE.Object3D();

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

    // This line is not really clear to me,
    // Z=0 in AE is Z=-distance here
    mesh.position.z -= distance;

    mesh.rotation.fromArray(orientation);
    return mesh;
  });
  solidObjects.forEach(obj => scene.add(obj));

  // const test = new THREE.Mesh(new THREE.BoxGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 'red' }));
  // scene.add(test);
  // test.scale.set(1080, 1080, 1);
  // test.position.set(0, 0, -distance);

  const zero = new THREE.Vector3();
  
  // const cameraContainer = new THREE.Object3D();
  // cameraContainer.position.set(0, 0, distance);
  // cameraContainer.add(camera);
  // camera.lookAt(zero);
  // scene.add(cameraContainer);

//  camera.position.set(-comp.width, comp.height / 2, -distance)
//  camera.lookAt(zero);
  const cameraOrigin = new THREE.Vector3(
    0,
    0,
    0
  );
  const cameraOffset = new THREE.Vector3(-comp.width, -comp.height, -distance);
  camera.position.z = -1;
  camera.position.y = 0;
  camera.lookAt(cameraOrigin);

  render();
  createLoop(dt => {
    render();
  })
  .start();
  video.play();

  function render () {
    const value = timeline.value(video.currentTime || 0);
    camera.position.fromArray(value);
    camera.position.add(cameraOffset);
    renderer.render(scene, camera);
  }
}
