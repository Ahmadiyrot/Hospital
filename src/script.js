import * as THREE from "three";
// import GUI from "lil-gui";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import gsap from "gsap";
//import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Loading Manager and Loading Bar Element
const loadingBarElement = document.querySelector(".loading-bar");
const menuElement = document.querySelector(".menu");
const loadingManager = new THREE.LoadingManager(
  // On Load
  () => {
    window.setTimeout(() => {
      // Animate overlay
      gsap.to(overlayMaterial.uniforms.uAlpha, {
        duration: 3,
        value: 0,
        delay: 1,
      });
      // Update loading bar
      loadingBarElement.classList.add("ended");
      loadingBarElement.style.transform = "";
    }, 500);
  },
  // On Progress
  (itemUrl, itemsLoaded, itemsTotal) => {
    const progressRatio = itemsLoaded / itemsTotal;
    loadingBarElement.style.transform = `scaleX(${progressRatio})`;
  },
);

/**
 * Base Setup
 */
// Debug GUI
// const gui = new GUI();
const textureLoader = new THREE.TextureLoader(loadingManager);

// Textures
const particlesTexture = textureLoader.load("/textures/particles/4.png");

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Loaders
const rgbeLoader = new RGBELoader(loadingManager);
const gltfLoader = new GLTFLoader(loadingManager);

let model = null;

// Load GLTF Model
gltfLoader.load("/models/HospitalFinal1.glb", (gltf) => {
  scene.add(gltf.scene);
  gltf.scene.position.set(0, 0, 0);

  gltf.scene.traverse((child) => {
    if (child.name === "Door001") {
      model = child;
    }
  });

  console.log(model ? "Model Door001 found" : "Model Door001 not found");
});

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  fxaaPass.material.uniforms["resolution"].value.set(
    1 / (sizes.width * pixelRatio),
    1 / (sizes.height * pixelRatio),
  );
});

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100,
);
camera.position.set(1.55, -0.229, -2.476);
camera.lookAt(-0.504, -0.931, -0.404);
scene.add(camera);

// Environment Map
rgbeLoader.load(
  "/environmentMaps/anniversary_lounge_1k.hdr",
  (environmentMap) => {
    environmentMap.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = environmentMap;
    scene.background = environmentMap;
  },
);

scene.environmentIntensity = 0.25;
scene.backgroundBlurriness = 1;
scene.backgroundIntensity = 1;

// Sky and Fog
const sky = new Sky();
sky.scale.set(100, 100, 100);
scene.add(sky);
scene.fog = new THREE.FogExp2("#04343f", 0.27);
sky.material.uniforms["turbidity"].value = 0;
sky.material.uniforms["rayleigh"].value = 0.41;
sky.material.uniforms["mieCoefficient"].value = 0;
sky.material.uniforms["mieDirectionalG"].value = 0;
sky.material.uniforms["sunPosition"].value.set(0.3, -0.038, -0.95);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Postprocessing Setup
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass();
bloomPass.strength = 0.35;
bloomPass.radius = 0;
bloomPass.threshold = 0;
composer.addPass(bloomPass);

const fxaaPass = new ShaderPass(FXAAShader);
const pixelRatio = renderer.getPixelRatio();
fxaaPass.material.uniforms["resolution"].value.set(
  1 / (sizes.width * pixelRatio),
  1 / (sizes.height * pixelRatio),
);
composer.addPass(fxaaPass);

// Raycaster and Mouse Interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / sizes.width) * 2 - 1;
  mouse.y = -(event.clientY / sizes.height) * 2 + 1;
});

window.addEventListener(
  "click",
  (event) => {
    raycaster.setFromCamera(mouse, camera);
    if (model) {
      const intersects = raycaster.intersectObject(model, true);
      if (intersects.length > 0) {
        animateCameraToModel(intersects[0].point);
        console.log("Clicked on model");
      }
    }
  },
  false,
);

// Materials for highlighting
const defaultMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0x000000,
  roughness: 0.5,
  metalness: 0.1,
});

const glowMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 1.2,
  roughness: 0.5,
  metalness: 0.1,
});

// Overlay for Loading Screen
const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
const overlayMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthTest: false,
  uniforms: {
    uAlpha: { value: 1 },
  },
  vertexShader: `
        void main() {
            gl_Position = vec4(position, 1.0);
        }
    `,
  fragmentShader: `
        uniform float uAlpha;
        void main() {
            gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
        }
    `,
});
const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
overlay.renderOrder = 999;
scene.add(overlay);

const resetOverlay = () => {
  gltfLoader.load("/models/reception.glb", (gltf) => {
    scene.add(gltf.scene);
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.material.side = THREE.DoubleSide;
      }
    });

    gltf.scene.position.set(20, -0.4, 10);
    gltf.scene.scale.set(0.1, 0.1, 0.1);
    camera.position.set(20.67, 0.25, 9.98);
    camera.lookAt(19, 0.25, 9);
    scene.backgroundBlurriness = 0;
    scene.backgroundIntensity = 0;
    scene.fog = new THREE.FogExp2("#04343f", 0.14);
    sky.material.uniforms["turbidity"].value = 0;
    sky.material.uniforms["rayleigh"].value = 4;
    sky.material.uniforms["mieCoefficient"].value = 0;
    sky.material.uniforms["mieDirectionalG"].value = 0;

    bloomPass.strength = 0.35;
    bloomPass.radius = 0;
    bloomPass.threshold = 1;
  });

  gsap.to(overlayMaterial.uniforms.uAlpha, {
    duration: 1,
    value: 0,
    delay: 0,
    ease: "power4.in",
  });
};

const animateCameraToModel = (targetPosition) => {
  gsap.to(camera.position, {
    duration: 0.6,
    x: 1.6,
    y: -0.229,
    z: -2.526,
    ease: "cubic-bezier(.28,-0.49,.92,.39)",
    onComplete: () => {
      gsap.to(camera.position, {
        duration: 1,
        x: 1.038,
        y: -0.3,
        z: -1.781,
        ease: "expo.in",
      });
      gsap.to(overlayMaterial.uniforms.uAlpha, {
        duration: 1,
        value: 1,
        delay: 0,
        ease: "power4.in",
        onComplete: () => {
          gsap.to(menuElement, {
            duration: 1.5,
            opacity: 0.5, // chnage this to 1
            delay: 1,
            ease: "power2.inOut",
          });
          resetOverlay();
        },
      });
    },
  });
};
/**
 * Particles
 */
const particlesCount = 1000;
const positions = new Float32Array(particlesCount * 3);
const initialPositions = new Float32Array(particlesCount * 3);

for (let i = 0; i < particlesCount; i++) {
  const x = (Math.random() - 0.5) * 10;
  const y = 4 * 0.5 - Math.random() * 4;
  const z = Math.random() - 0.5;

  positions[i * 3] = x;
  positions[i * 3 + 1] = y;
  positions[i * 3 + 2] = z;

  initialPositions[i * 3] = x;
  initialPositions[i * 3 + 1] = y;
  initialPositions[i * 3 + 2] = z;
}

const particlesGeometry = new THREE.BufferGeometry();
particlesGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(positions, 3),
);

const particlesMaterial = new THREE.PointsMaterial({
  color: "#ffeded",
  sizeAttenuation: true,
  size: 0.06,
  alphaMap: particlesTexture,
  transparent: true,
  depthWrite: false,
});

const particles = new THREE.Points(particlesGeometry, particlesMaterial);
particles.rotation.y = 2.5;
particles.position.x = 2;
particles.position.z = -1;

scene.add(particles);
//const controls = new OrbitControls(camera, renderer.domElement);
//controls.update();

/**
 * Animation Loop
 */
const clock = new THREE.Clock();
let previousTime = 0;

const tick = () => {
  //controls.update();
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousTime;
  previousTime = elapsedTime;

  // Adjust overlay position to be in front of the camera
  overlay.position.copy(camera.position);
  overlay.rotation.copy(camera.rotation);
  overlay.translateZ(-0.1);

  camera.position.y = -0.129 + Math.sin(elapsedTime / 1.5) * 0.05;
  camera.rotation.x += Math.sin(elapsedTime / 0.1) * 0.00005;
  camera.rotation.y += Math.sin(elapsedTime / 0.5) * 0.00005;

  raycaster.setFromCamera(mouse, camera);

  for (let i = 0; i < particlesCount; i++) {
    positions[i * 3 + 1] =
      initialPositions[i * 3 + 1] + Math.sin(elapsedTime / 6.5 + i) * 0.5;
  }

  particlesGeometry.attributes.position.needsUpdate = true;

  if (model) {
    const intersects = raycaster.intersectObject(model, true);
    model.material = intersects.length > 0 ? glowMaterial : defaultMaterial;
  }

  renderer.render(scene, camera);
  composer.render();

  window.requestAnimationFrame(tick);
};

tick();
