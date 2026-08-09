import type { MeshPiece, MeshRegenType, LogoId, PreMeshVariant, MeshKey, MeshCacheEntry, PolyId, MeshSpecs, MeshId, DynMeshVariant } from '../types/MeshRegenTypes';
import type { DeviceTiers, DeviceTypes } from '../types/DeviceTypes';
import { prepareIslands } from "../mesh/meshCore";
import { getDevicePerformance, getDeviceTier } from '../components/benchmark/benchmarkDevice';

//  projects logos  //
import aluraLogo from '../assets/logos/alura.svg';
import meshregenLogo from '../assets/logos/tm.svg';
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
    paths: [`M374 231.2h571.3c16 0 21.5 13 12.3 29l-67.1 116.2h-222.9l-240.3 416.4h-125.8c-16 0-21.5-13-12.3-29l206.8-358.3c9.3-16 3.8-29-12.3-29h-164.5c-16 0-21.5-13-12.3-29l67.1-116.3zM251 444.2h125.9c16 0 21.5 13 12.3 29l-184.6 319.6h-125.8c-16 0-21.5-13-12.3-29l184.5-319.6zM696.3 444.2h125.9c16 0 21.5 13 12.3 29l-184.6 319.6h-125.8c-16 0-21.5-13-12.3-29l184.5-319.6z`],
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
  { mesh: 'alura', type: 'wire', userStep: 0.5, offsetMultiplier: 3 },
  { mesh: 'alura', type: 'glass', userStep: 0.1, offsetMultiplier: 3 },
  { mesh: 'hairday', type: 'wire', userStep: 0.25, offsetMultiplier: 2 },
  { mesh: 'hairday', type: 'glass', userStep: 0.12, offsetMultiplier: 3 },
  { mesh: 'meshregen', type: 'wire', userStep: 0.25, offsetMultiplier: 2 },
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