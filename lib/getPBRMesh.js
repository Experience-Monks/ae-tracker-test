const noop = function () {};

module.exports = function ({ renderer }, cb = noop) {
  var genCubeUrls = function (prefix, postfix) {
    return [
      prefix + 'px' + postfix, prefix + 'nx' + postfix,
      prefix + 'py' + postfix, prefix + 'ny' + postfix,
      prefix + 'pz' + postfix, prefix + 'nz' + postfix
    ];
  };

  const triRepeats = 10;
  // const map = createTexture('assets/textures/pattern_182/diffuse.png', triRepeats);
  // const normalMap = createTexture('assets/textures/pattern_182/normal.png', triRepeats);
  // const specularMap = createTexture('assets/textures/pattern_182/specular.png', triRepeats);

  const material = createPBRMaterial({
    // map: map,
    // normalMap,
    // specularMap,
    roughnessMap: null,
    color: 0xffffff,
    // bumpScale: 0.1,
    metalness: 1,
    roughness: 0.5,
    shading: THREE.SmoothShading
  });

  let hdrUrls = genCubeUrls('assets/pisaHDR/', '.hdr');
  let cubeLoader = new THREE.HDRCubeTextureLoader();
  cubeLoader.load(THREE.UnsignedByteType, hdrUrls, function (hdrCubeMap) {
    const pmremGenerator = new THREE.PMREMGenerator(hdrCubeMap);
    pmremGenerator.update(renderer);

    const pmremCubeUVPacker = new THREE.PMREMCubeUVPacker(pmremGenerator.cubeLods);
    pmremCubeUVPacker.update(renderer);

    const envMap = pmremCubeUVPacker.CubeUVRenderTarget;
    // const envMap = pmremGenerator.cubeLods[ pmremGenerator.cubeLods.length - 4 ];
    material.envMap = envMap;
    material.needsUpdate = true;
    cb(null, material);
    // loadMesh(envMap);
  });

  function loadMesh () {
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.multiplyScalar(0.25);
    // cb(null, mesh);

    // new THREE.JSONLoader().load('assets/pyramid.json', (geometry) => {
    //   const mesh = new THREE.Mesh(geometry, material);
    //   mesh.scale.multiplyScalar(0.4);
    //   mesh.castShadow = true;
    //   cb(null, mesh);
    // }, noop, (err) => {
    //   console.error(err);
    //   cb(new Error('Unable to load mesh'));
    // });
  }

  function createTexture (url, repeats = 1) {
    const textureLoader = new THREE.TextureLoader();
    return textureLoader.load(url, function (map) {
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(repeats, repeats);
    }, (err) => {
      console.error(err);
    });
  }

  function createPBRMaterial (opts = {}) {
    const material = new THREE.MeshPhysicalMaterial(opts);
    material.name = 'meshStandard';
    return material;
  }
};
