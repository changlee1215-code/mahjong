// Entry point: exposes modern Three.js + selected addons as a single global `THREE`,
// so existing classic <script> code (THREE.Mesh, THREE.Scene, ...) keeps working
// even when index.html is opened directly via file:// (ES modules would be blocked).
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const THREE = Object.assign({}, T, {
    RoundedBoxGeometry,
    RoomEnvironment,
    RGBELoader,
    EXRLoader,
    GLTFLoader,
    EffectComposer,
    RenderPass,
    ShaderPass,
    UnrealBloomPass,
    GTAOPass,
    BokehPass,
    SMAAPass,
    OutputPass
});

globalThis.THREE = THREE;
