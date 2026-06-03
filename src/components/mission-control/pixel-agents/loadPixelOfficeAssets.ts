import { setFloorSprites } from "./office/floorTiles";
import { buildDynamicCatalog } from "./office/layout/furnitureCatalog";
import { migrateLayoutColors } from "./office/layout/layoutSerializer";
import { setCharacterTemplates } from "./office/sprites/spriteData";
import type { OfficeLayout, SpriteData } from "./office/types";
import { setWallSprites } from "./office/wallTiles";

const ASSET_BASE = "/mission-control-office/assets";
const PNG_ALPHA_THRESHOLD = 2;
const WALL_PIECE_WIDTH = 16;
const WALL_PIECE_HEIGHT = 32;
const WALL_GRID_COLS = 4;
const WALL_BITMASK_COUNT = 16;
const FLOOR_TILE_SIZE = 16;
const CHARACTER_DIRECTIONS = ["down", "up", "right"] as const;
const CHAR_FRAME_W = 16;
const CHAR_FRAME_H = 32;
const CHAR_FRAMES_PER_ROW = 7;

const CHARACTER_FILES = ["char_0.png", "char_1.png", "char_2.png", "char_3.png", "char_4.png", "char_5.png"];
const FLOOR_FILES = [
  "floor_0.png",
  "floor_1.png",
  "floor_2.png",
  "floor_3.png",
  "floor_4.png",
  "floor_5.png",
  "floor_6.png",
  "floor_7.png",
  "floor_8.png",
];
const WALL_FILES = ["wall_0.png"];
const FURNITURE_DIRECTORIES = [
  "BIN",
  "BOOKSHELF",
  "CACTUS",
  "CLOCK",
  "COFFEE",
  "COFFEE_TABLE",
  "CUSHIONED_BENCH",
  "CUSHIONED_CHAIR",
  "DESK",
  "DOUBLE_BOOKSHELF",
  "HANGING_PLANT",
  "LARGE_PAINTING",
  "LARGE_PLANT",
  "PC",
  "PLANT",
  "PLANT_2",
  "POT",
  "SMALL_PAINTING",
  "SMALL_PAINTING_2",
  "SMALL_TABLE",
  "SOFA",
  "TABLE_FRONT",
  "WHITEBOARD",
  "WOODEN_BENCH",
  "WOODEN_CHAIR",
];

type CharacterDirectionSprites = Record<(typeof CHARACTER_DIRECTIONS)[number], SpriteData[]>;

type DecodedPng = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

type ManifestAsset = {
  type: "asset";
  id: string;
  file?: string;
  width: number;
  height: number;
  footprintW: number;
  footprintH: number;
  orientation?: string;
  state?: string;
  frame?: number;
  mirrorSide?: boolean;
};

type ManifestGroup = {
  type: "group";
  groupType: "rotation" | "state" | "animation";
  rotationScheme?: string;
  orientation?: string;
  state?: string;
  members: ManifestNode[];
};

type ManifestNode = ManifestAsset | ManifestGroup;

type FurnitureManifest = {
  id: string;
  name: string;
  category: string;
  type: "asset" | "group";
  file?: string;
  width?: number;
  height?: number;
  footprintW?: number;
  footprintH?: number;
  groupType?: "rotation" | "state" | "animation";
  rotationScheme?: string;
  canPlaceOnWalls: boolean;
  canPlaceOnSurfaces: boolean;
  backgroundTiles: number;
  members?: ManifestNode[];
};

type FurnitureAsset = {
  id: string;
  name: string;
  label: string;
  category: string;
  file: string;
  furniturePath: string;
  width: number;
  height: number;
  footprintW: number;
  footprintH: number;
  isDesk: boolean;
  canPlaceOnWalls: boolean;
  groupId?: string;
  canPlaceOnSurfaces?: boolean;
  backgroundTiles?: number;
  orientation?: string;
  state?: string;
  mirrorSide?: boolean;
  rotationScheme?: string;
  animationGroup?: string;
  frame?: number;
};

type InheritedManifestProps = {
  groupId: string;
  name: string;
  category: string;
  canPlaceOnWalls: boolean;
  canPlaceOnSurfaces: boolean;
  backgroundTiles: number;
  orientation?: string;
  state?: string;
  rotationScheme?: string;
  animationGroup?: string;
};

type PixelOfficeAssets = {
  layout: OfficeLayout;
};

let assetPromise: Promise<PixelOfficeAssets> | null = null;

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  if (a < PNG_ALPHA_THRESHOLD) {
    return "";
  }

  const rgb =
    `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b
      .toString(16)
      .padStart(2, "0")}`.toUpperCase();
  return a >= 255 ? rgb : `${rgb}${a.toString(16).padStart(2, "0").toUpperCase()}`;
}

function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const index = (y * width + x) * 4;
  return [data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0, data[index + 3] ?? 0] as const;
}

function readSprite(png: DecodedPng, width: number, height: number, offsetX = 0, offsetY = 0): SpriteData {
  const sprite: SpriteData = [];

  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      const sourceX = offsetX + x;
      const sourceY = offsetY + y;
      if (sourceX >= png.width || sourceY >= png.height) {
        row.push("");
        continue;
      }

      const [r, g, b, a] = getPixel(png.data, png.width, sourceX, sourceY);
      row.push(rgbaToHex(r, g, b, a));
    }
    sprite.push(row);
  }

  return sprite;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

async function decodePng(url: string): Promise<DecodedPng> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error(`Could not decode ${url}`);
  }

  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return {
    width: canvas.width,
    height: canvas.height,
    data: imageData.data,
  };
}

async function decodeCharacters(): Promise<CharacterDirectionSprites[]> {
  return Promise.all(
    CHARACTER_FILES.map(async (file) => {
      const png = await decodePng(`${ASSET_BASE}/characters/${file}`);
      const byDirection: CharacterDirectionSprites = {
        down: [],
        up: [],
        right: [],
      };

      CHARACTER_DIRECTIONS.forEach((direction, directionIndex) => {
        for (let frame = 0; frame < CHAR_FRAMES_PER_ROW; frame++) {
          byDirection[direction].push(
            readSprite(png, CHAR_FRAME_W, CHAR_FRAME_H, frame * CHAR_FRAME_W, directionIndex * CHAR_FRAME_H),
          );
        }
      });

      return byDirection;
    }),
  );
}

async function decodeFloors(): Promise<SpriteData[]> {
  return Promise.all(
    FLOOR_FILES.map(async (file) => {
      const png = await decodePng(`${ASSET_BASE}/floors/${file}`);
      return readSprite(png, FLOOR_TILE_SIZE, FLOOR_TILE_SIZE);
    }),
  );
}

async function decodeWalls(): Promise<SpriteData[][]> {
  return Promise.all(
    WALL_FILES.map(async (file) => {
      const png = await decodePng(`${ASSET_BASE}/walls/${file}`);
      const wallSet: SpriteData[] = [];

      for (let mask = 0; mask < WALL_BITMASK_COUNT; mask++) {
        const offsetX = (mask % WALL_GRID_COLS) * WALL_PIECE_WIDTH;
        const offsetY = Math.floor(mask / WALL_GRID_COLS) * WALL_PIECE_HEIGHT;
        wallSet.push(readSprite(png, WALL_PIECE_WIDTH, WALL_PIECE_HEIGHT, offsetX, offsetY));
      }

      return wallSet;
    }),
  );
}

function flattenManifest(node: ManifestNode, inherited: InheritedManifestProps): Omit<FurnitureAsset, "furniturePath">[] {
  if (node.type === "asset") {
    const orientation = node.orientation ?? inherited.orientation;
    const state = node.state ?? inherited.state;

    return [
      {
        id: node.id,
        name: inherited.name,
        label: inherited.name,
        category: inherited.category,
        file: node.file ?? `${node.id}.png`,
        width: node.width,
        height: node.height,
        footprintW: node.footprintW,
        footprintH: node.footprintH,
        isDesk: inherited.category === "desks",
        canPlaceOnWalls: inherited.canPlaceOnWalls,
        canPlaceOnSurfaces: inherited.canPlaceOnSurfaces,
        backgroundTiles: inherited.backgroundTiles,
        groupId: inherited.groupId,
        ...(orientation ? { orientation } : {}),
        ...(state ? { state } : {}),
        ...(node.mirrorSide ? { mirrorSide: true } : {}),
        ...(inherited.rotationScheme ? { rotationScheme: inherited.rotationScheme } : {}),
        ...(inherited.animationGroup ? { animationGroup: inherited.animationGroup } : {}),
        ...(node.frame !== undefined ? { frame: node.frame } : {}),
      },
    ];
  }

  return node.members.flatMap((member) => {
    const childProps: InheritedManifestProps = { ...inherited };

    if (node.groupType === "rotation" && node.rotationScheme) {
      childProps.rotationScheme = node.rotationScheme;
    }
    if (node.groupType === "state") {
      if (node.orientation) {
        childProps.orientation = node.orientation;
      }
      if (node.state) {
        childProps.state = node.state;
      }
    }
    if (node.groupType === "animation") {
      const orientation = node.orientation ?? inherited.orientation ?? "";
      const state = node.state ?? inherited.state ?? "";
      childProps.animationGroup = `${inherited.groupId}_${orientation}_${state}`.toUpperCase();
      if (node.state) {
        childProps.state = node.state;
      }
    }
    if (node.orientation && !childProps.orientation) {
      childProps.orientation = node.orientation;
    }

    return flattenManifest(member, childProps);
  });
}

function catalogFromManifest(manifest: FurnitureManifest, folderName: string): FurnitureAsset[] {
  if (manifest.type === "asset") {
    if (!manifest.width || !manifest.height || !manifest.footprintW || !manifest.footprintH) {
      return [];
    }

    const file = manifest.file ?? `${manifest.id}.png`;
    return [
      {
        id: manifest.id,
        name: manifest.name,
        label: manifest.name,
        category: manifest.category,
        file,
        furniturePath: `furniture/${folderName}/${file}`,
        width: manifest.width,
        height: manifest.height,
        footprintW: manifest.footprintW,
        footprintH: manifest.footprintH,
        isDesk: manifest.category === "desks",
        canPlaceOnWalls: manifest.canPlaceOnWalls,
        canPlaceOnSurfaces: manifest.canPlaceOnSurfaces,
        backgroundTiles: manifest.backgroundTiles,
        groupId: manifest.id,
      },
    ];
  }

  if (!manifest.members || !manifest.groupType) {
    return [];
  }

  return flattenManifest(
    {
      type: "group",
      groupType: manifest.groupType,
      rotationScheme: manifest.rotationScheme,
      members: manifest.members,
    },
    {
      groupId: manifest.id,
      name: manifest.name,
      category: manifest.category,
      canPlaceOnWalls: manifest.canPlaceOnWalls,
      canPlaceOnSurfaces: manifest.canPlaceOnSurfaces,
      backgroundTiles: manifest.backgroundTiles,
      ...(manifest.rotationScheme ? { rotationScheme: manifest.rotationScheme } : {}),
    },
  ).map((entry) => ({
    ...entry,
    furniturePath: `furniture/${folderName}/${entry.file}`,
  }));
}

async function loadFurniture() {
  const catalog = (
    await Promise.all(
      FURNITURE_DIRECTORIES.map(async (directory) => {
        const manifest = await fetchJson<FurnitureManifest>(`${ASSET_BASE}/furniture/${directory}/manifest.json`);
        return catalogFromManifest(manifest, directory);
      }),
    )
  ).flat();

  const sprites = Object.fromEntries(
    await Promise.all(
      catalog.map(async (entry) => {
        const png = await decodePng(`${ASSET_BASE}/${entry.furniturePath}`);
        return [entry.id, readSprite(png, entry.width, entry.height)] as const;
      }),
    ),
  );

  buildDynamicCatalog({ catalog, sprites });
}

async function loadPixelOfficeAssetsOnce(): Promise<PixelOfficeAssets> {
  const [characters, floors, walls, layout] = await Promise.all([
    decodeCharacters(),
    decodeFloors(),
    decodeWalls(),
    fetchJson<OfficeLayout>(`${ASSET_BASE}/default-layout-1.json`),
    loadFurniture(),
  ]);

  setCharacterTemplates(characters);
  setFloorSprites(floors);
  setWallSprites(walls);

  return {
    layout: migrateLayoutColors(layout),
  };
}

export function loadPixelOfficeAssets(): Promise<PixelOfficeAssets> {
  assetPromise ??= loadPixelOfficeAssetsOnce();
  return assetPromise;
}
