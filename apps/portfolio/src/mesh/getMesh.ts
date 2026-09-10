import type { MeshPiece, MeshRegenType, LogoId, PreMeshVariant, MeshKey, MeshCacheEntry, PolyId, MeshSpecs, MeshId, DynMeshVariant } from '../types/MeshRegenTypes';
import type { DeviceTiers, DeviceTypes } from '../types/DeviceTypes';
import { prepareIslands } from "../mesh/meshCore";
import { getDevicePerformance, getDeviceTier } from '../components/benchmark/benchmarkDevice';

//  projects logos  //
import aluraLogo from '../assets/logos/alura.svg';
import meshregenLogo from '../assets/logos/meshregen.svg';
import hairdayLogo from '../assets/logos/hairday.svg';



const meshCache = new Map<MeshKey, MeshCacheEntry>();

function getDeviceType(width: number = window.innerWidth) {
  if (width < 601) return "mobile";
  if (width < 1025) return "tablet";
  return "laptop";
}

const meshWorker = new Worker(
  new URL('../mesh/meshWorker.ts', import.meta.url),
  { type: 'module' }
);

// const meshWorker = new Worker(
//   new URL('./mesh/meshWorker.ts', import.meta.url),
//   { type: 'module' }
// );

// function getMeshWorker(): Worker {
//   const w = window as any;

//   if (!w.__meshWorker) {
//     console.log("🔥 Creating NEW worker");

//     w.__meshWorker = new Worker(
//       new URL('../mesh/meshWorker.ts', import.meta.url),
//       { type: 'module' }
//     );
//   }

//   return w.__meshWorker;
// }

//--------------------------------------
// Pre-defined meshes (stattic)
//--------------------------------------
const LOGOS: Record<LogoId, MeshSpecs> = {
  alura: {
    id: 'alura',
    paths: [`M513.5 532.7l-139.5 128.9 139.5-179.7 139.5 179.7-139.5-128.9zM692.3 676.5l94.1-52.5 7.9 52.5h-102zM785.3 623l-94.1 52.5-117.5-130.2 66.7 17.2 144.9 60.5zM766.2 552.1l39.8 32.8-165.6-24-66.7-17.2 74.7-5.1 117.8 13.5zM768.2 552.1l186.2-28.5-146.4 61.4-39.8-32.9zM954.5 522.1l-186.7 28.5-115.3-13 156.1-34.3 145.9 18.8zM906.7 468.8l-257.8 68.8-75 5.2 88.8-76 244 2zM994.9 347.3l-87.5 120-244-2 331.5-118zM237.7 624.1l94 52.5h-101.9l7.9-52.5zM450.2 545.3l-117.5 130.2-94-52.5 144.8-60.5 66.7-17.2zM257.7 552.2l117.7-13.4 74.7 5.1-66.7 17.2-165.6 24 39.9-32.9zM69.5 523.7l186.3 28.5-39.9 32.9-146.4-61.4zM256.2 550.7l-186.7-28.5 145.8-18.9 156.1 34.4-115.2 13zM375.1 537.6l-257.9-68.8 244.1-2 88.8 76-75-5.2zM29.1 347.4l87.5 120 244-2-331.5-118z`],
    svgUrl: aluraLogo,
    width: 1024,
    height: 1024,
  },
  hairday: {
    id: 'hairday',
    paths: [
      `M730.5,359.9c-2.5-26.4-24.7-47.1-51.8-47.1h-37.5v351.4h37.5c3.3,0,6.6-0.3,9.7-0.9V359.9H730.5z`,
      `M688.8,243.5c69.8,0,126.4,56.6,126.4,126.4V607c0,69.8-56.6,126.4-126.4,126.4H557.1l47.8,47.1h129 c70.8,0,128.1-57.4,128.1-128.1V416.7C862,321,784.5,243.5,688.8,243.5`,
      `M688.8,243.5H557.1v489.8h131.7c69.8,0,126.4-56.6,126.4-126.4V369.9C815.2,300.1,758.6,243.5,688.8,243.5 M730.7,612.1c0,28.7-23.3,52-52,52h-37.5V312.7h37.5c28.7,0,52,23.3,52,52V612.1z`,
      `M246.1,243.5v199.3h47.8V290.6L246.1,243.5z M162,733.4l47.1,47.1h84.7V563.9h41.8v-47.3h-89.5v216.8H162z M419.6,243.5l47.3,47.1v489.8h-84.1l-47.1-47.1h84L419.6,243.5L419.6,243.5z`,
      `M162,243.5h84.1v199.3h89.5V243.5h84v489.8h-84V516.6h-89.5v216.8H162V243.5z`,
    ],
    svgUrl: hairdayLogo,
    width: 1024,
    height: 1024,
  },
  meshregen: {
    id: 'meshregen',
    paths: [
      `M558.61,491.368l82.938-70.779,64.673,113.735-147.611-42.956Z`,
      `M877.618,222.271l-236.071,198.319,64.673,113.735,171.398-312.053Z`,
      `M877.618,483.829V222.271l-171.398,312.053,171.398-50.496Z`,
      `M558.61,491.368l89.947,121.805,57.664-78.85-147.611-42.956Z`,
      `M576.351,673.041l72.206-59.867-89.947-121.805,17.741,181.673Z`,
      `M706.22,580.611v-46.287l-57.664,78.85,57.664-32.563Z`,
      `M706.22,580.611l20.764-11.725-20.764-34.562v46.287Z`,
      `M726.985,568.886l150.634-85.058-171.398,50.496,20.764,34.562Z`,
      `M877.618,483.829l-150.634,85.058,43.667,82.747,106.966-167.804Z`,
      `M770.652,651.633l106.966,194.744v-362.549l-106.966,167.804Z`,
      `M770.652,651.633l-64.432,101.081,171.398,93.664-106.966-194.744Z`,
      `M770.652,651.633l-43.667-82.747-20.764,11.725v172.102l64.432-101.081Z`,
      `M576.351,673.041l-120.037-147.361-79.277,26.591,199.314,120.77Z`,
      `M456.314,525.68l120.037,147.361-17.741-181.673-102.296,34.312Z`,
      `M327.975,286.579l128.339,239.102,102.296-34.312-230.635-204.79Z`,
      `M387.977,398.366l-60.003-111.788,22.938,140.177,37.065-28.389Z`,
      `M350.913,426.756l105.401,98.925-68.336-127.314-37.065,28.389Z`,
      `M289.744,613.174l-57.345,93.299,100.673,41.416-43.327-134.715Z`,
      `M214.559,837.729l110.867-79.009-98.761-38.23-12.106,117.239Z`,
      `M157.851,698.826l-8.283,42.053,34.407-17.204-26.124-24.85Z`,
      `M223.479,572.667l-39.504,22.301,39.504,32.496v-54.796Z`,
      `M255.975,605.8l23.575-10.195-40.779-13.4,17.204,23.595Z`,
      `M177.603,510.98l-23.575,17.722,23.575,19.799v-37.521Z`,
      `M159.762,420.59l33.133,24.644,5.735-46.867-38.867,22.223Z`,
      `M297.39,304.419l-38.23,29.947,45.558,25.487-7.327-55.434Z`,
      `M149.567,279.57l-3.186,59.257,52.248-25.487-49.062-33.77Z`,
      `M267.444,177.623l-8.283,55.434,54.796-5.735-46.513-49.699Z`,
      `M269.992,277.021l-10.832,14.018h20.389l-9.558-14.018Z`,
      `M385.32,498.118l2.658,22.301,20.28-15.292-22.938-7.009Z`,
      `M357.976,494.933l-15.984-68.177-37.274,38.867,53.258,29.31Z`,
      `M245.143,491.368l105.77-56.967-127.434-69.451,21.664,126.418Z`,
      `M312.045,389.8h21.027l-14.655-20.389-6.372,20.389Z`,
      `M203.727,651.039l-29.947,22.002,33.77,7.49-3.823-29.492Z`,
      `M183.975,787.393l-10.195,12.743,16.885,4.46-6.69-17.204Z`,
      `M371.874,722.641v-170.37l-72.159,53.529,72.159,116.841Z`,
      `M377.037,545.827l-10.419-47.708-115.646-3.186,126.065,50.894Z`,
      `M369.962,548.501l-118.991-50.383,40.142,111.266,78.85-60.883Z`,
    ],
    svgUrl: meshregenLogo,
    width: 1024,
    height: 1024,
  },

};

//--------------------------------------
// dynamic meshes (defined at runtiime)
//--------------------------------------
const MESHES: Partial<Record<MeshId, MeshSpecs>> = {
  ...LOGOS,
  // ...DYNAMIC_MESHES,
};

const PRE_MESH_VARIANTS: PreMeshVariant[] = [
  // { mesh: 'alura', type: 'wire', userStep: 0.5, offsetMultiplier: 3 },
  { mesh: 'alura', type: 'glass', userStep: 0.1, offsetMultiplier: 3 },
  // { mesh: 'hairday', type: 'wire', userStep: 0.25, offsetMultiplier: 2 },
  { mesh: 'hairday', type: 'glass', userStep: 0.12, offsetMultiplier: 3 },
  // { mesh: 'meshregen', type: 'wire', userStep: 0.25, offsetMultiplier: 2 },
  { mesh: 'meshregen', type: 'glass', userStep: 0.12, offsetMultiplier: 3 },
];

const MESH_VARIANTS: (PreMeshVariant | DynMeshVariant)[] = [
  ...PRE_MESH_VARIANTS,
  // ...DYN_MESH_VARIANTS
]

const BASE_SPACING: Record<LogoId, Record<DeviceTypes, number>> = {
  alura: {
    'laptop': 0.1,
    'tablet': 0.13,
    'mobile': 0.2,
  },
  hairday: {
    'laptop': 0.12,
    'tablet': 0.17,
    'mobile': 0.225,
  },
  meshregen: {
    'laptop': 0.12,
    'tablet': 0.17,
    'mobile': 0.225,
  },
}

const pendingResolvers = new Map<MeshKey,
  { resolve: (v: MeshPiece[]) => void; reject: (e: unknown) => void; }
>();

meshWorker.onmessage = (e: MessageEvent) => {
  const { key, status, pieces, error } = e.data;

  const pending = pendingResolvers.get(key);
  if (!pending) return;

  if (status === 'done') {
    meshCache.set(key, {
      status: 'ready',
      pieces
    });

    pending.resolve(pieces);
  } else {
    console.error('Worker error:', error);

    meshCache.set(key, { status: 'error' });
    pending.reject(error);
  }

  pendingResolvers.delete(key);
};

export default function getMesh({ mesh, type }: { mesh: MeshId; type: PreMeshVariant['type']; }): MeshPiece[] {
  // check if variant exists
  const variant = MESH_VARIANTS.find(v => 
    v.mesh === mesh && v.type === type
  );

  const specs = MESHES[mesh];

  if (!variant || !specs) return [];

  const key = makeMeshKey(mesh, variant, specs);

  const entry = meshCache.get(key);

  return entry?.status === 'ready' ? entry.pieces! : [];
}

function scheduleMeshGeneration(
  key: MeshKey,
  params: MeshRegenType
): Promise<MeshPiece[]> {
  const existing = meshCache.get(key);

  if (existing?.status === 'ready') {
    return Promise.resolve(existing.pieces!);
  }
  if (existing?.status === 'generating') {
    return existing.promise!;
  }

  let resolve!: (v: MeshPiece[]) => void;
  let reject!: (e: unknown) => void;

  const promise = new Promise<MeshPiece[]>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  meshCache.set(key, {
    status: 'generating',
    promise
  });

  const run = () => {
    pendingResolvers.set(key, { resolve, reject });

    const islands = prepareIslands(params.paths!, params.userStep);

    meshWorker.postMessage({
      key,
      params: {
        ...params,
        islands,
        paths: undefined 
      }
    });
  };

  setTimeout(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(run, { timeout: 1000 });
    } else {
      setTimeout(run, 0);
    }
  }, 3500);

  return promise;
}

export async function bakeLogoColors(
  logo: MeshSpecs
): Promise<ImageData> {
  const canvas = document.createElement('canvas');
  canvas.width = logo.width;
  canvas.height = logo.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = new Image();

  img.src = logo.svgUrl!;
  await img.decode();

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export async function bakeAllLogoColors(): Promise<Record<LogoId, ImageData>> {
  const entries = await Promise.all(
    (Object.entries(LOGOS) as [LogoId, MeshSpecs][]).map(
      async ([logo, specs]) => {
        const imageData = await bakeLogoColors(specs);
        return [logo, imageData] as const;
      }
    )
  );

  return Object.fromEntries(entries) as Record<LogoId, ImageData>;
}

function adjustSpacingForPerformance(tier: DeviceTiers, baseSpacing: number, multiplier = 1) {
  // higher multiplier = less triangles
  if (tier === 'high') multiplier = 1;
  else if (tier === 'mid') multiplier = 1.25;
  // else if (tier <= 20) multiplier = 1.75;
  else multiplier = 1.75; // 2;

  console.error('adjusted spacing from', baseSpacing, ' to ', baseSpacing * multiplier);

  return baseSpacing * multiplier
}

export async function preloadMeshes(colorCanvases: Record<LogoId, ImageData>) {
  const currDevice = getDeviceType();
  const deviceTier = await getDevicePerformance().then(getDeviceTier);

  for (const variant of PRE_MESH_VARIANTS) {
    const spec = LOGOS[variant.mesh];

    const key = makeMeshKey(variant.mesh, variant, spec);

    scheduleMeshGeneration(key, {
      paths: spec.paths,
      islands: prepareIslands(spec.paths, variant.userStep),
      userStep: variant.type === 'glass' && isLogoId(variant.mesh) ? adjustSpacingForPerformance(deviceTier, BASE_SPACING[variant.mesh][currDevice]) : variant.userStep,
      offsetMultiplier: variant.offsetMultiplier,
      width: spec.width,
      height: spec.height,
      imageData: isLogoId(variant.mesh) ? colorCanvases[variant.mesh] : undefined,
    });
  }
}

export function loadMeshAsync(meshProps: MeshSpecs & { id: PolyId; userStep: number; offsetMultiplier: number; }): Promise<MeshPiece[]> {
  MESHES[meshProps.id] = { 
    id: meshProps.id, 
    paths: meshProps.paths, 
    width: meshProps.width, 
    height: meshProps.height 
  };

  const variantData: DynMeshVariant = {
    mesh: meshProps.id,
    type: 'wire',
    offsetMultiplier: meshProps.offsetMultiplier,
    userStep: meshProps.userStep
  };

  const variantExists = MESH_VARIANTS.find(v => v.mesh === meshProps.id && v.type === 'wire');

  if (!variantExists) {
    MESH_VARIANTS.push(variantData);
  }

  const key = makeMeshKey(meshProps.id, variantData, meshProps);

  return scheduleMeshGeneration(key, {
    paths: meshProps.paths,
    islands: prepareIslands(meshProps.paths, meshProps.userStep),
    userStep: meshProps.userStep,
    offsetMultiplier: meshProps.offsetMultiplier,
    width: meshProps.width,
    height: meshProps.height,
  });
}

function isLogoId(mesh: LogoId | PolyId): mesh is LogoId {
  return mesh in LOGOS;
}

function makeMeshKey(
  mesh: MeshId,
  variant: PreMeshVariant | DynMeshVariant,
  specs: MeshSpecs
): MeshKey {
  return [
    mesh,
    variant.type,
    variant.userStep,
    variant.offsetMultiplier,
    specs.width,
    specs.height
  ].join('|');
}