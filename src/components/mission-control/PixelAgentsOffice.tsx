"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

import type { PixelOfficeAgent } from "./mission-control-office-types";
import {
  CHARACTER_SITTING_OFFSET_PX,
  TOOL_OVERLAY_VERTICAL_OFFSET,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./pixel-agents/constants";
import { EditorState } from "./pixel-agents/office/editor/editorState";
import { OfficeCanvas } from "./pixel-agents/office/components/OfficeCanvas";
import { OfficeState } from "./pixel-agents/office/engine/officeState";
import { defaultZoom } from "./pixel-agents/office/toolUtils";
import { CharacterState, TILE_SIZE } from "./pixel-agents/office/types";
import { loadPixelOfficeAssets } from "./pixel-agents/loadPixelOfficeAssets";

type PixelAgentsOfficeProps = {
  agents: PixelOfficeAgent[];
};

function cloneLayoutForOffice(layout: ReturnType<OfficeState["getLayout"]>) {
  if (typeof structuredClone === "function") {
    return structuredClone(layout);
  }

  return JSON.parse(JSON.stringify(layout)) as typeof layout;
}

function PixelOfficeZoomControls({
  zoom,
  onZoomChange,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  return (
    <div data-slot="pixel-office-zoom-controls" className="absolute left-4 top-4 z-20 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => onZoomChange(zoom + 1)}
        disabled={zoom >= ZOOM_MAX}
        className="flex h-9 w-9 items-center justify-center border border-white/15 bg-black/70 text-white shadow-[0_10px_24px_rgba(0,0,0,0.34)] transition hover:bg-white/10 disabled:cursor-default disabled:opacity-35"
        aria-label="Zoom in"
        title="Zoom in"
      >
        <ZoomIn className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onZoomChange(zoom - 1)}
        disabled={zoom <= ZOOM_MIN}
        className="flex h-9 w-9 items-center justify-center border border-white/15 bg-black/70 text-white shadow-[0_10px_24px_rgba(0,0,0,0.34)] transition hover:bg-white/10 disabled:cursor-default disabled:opacity-35"
        aria-label="Zoom out"
        title="Zoom out"
      >
        <ZoomOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function PixelOfficeAgentOverlay({
  officeState,
  agents,
  containerRef,
  zoom,
  panRef,
}: {
  officeState: OfficeState;
  agents: PixelOfficeAgent[];
  containerRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  panRef: RefObject<{ x: number; y: number }>;
}) {
  const [positions, setPositions] = useState<
    Array<{
      id: number;
      name: string;
      statusLabel: string;
      activity: string;
      isActive: boolean;
      showDetail: boolean;
      left: number;
      top: number;
    }>
  >([]);

  useEffect(() => {
    let frameId = 0;
    const tick = () => {
      const container = containerRef.current;
      if (!container) {
        setPositions([]);
        frameId = requestAnimationFrame(tick);
        return;
      }

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const canvasW = Math.round(rect.width * dpr);
      const canvasH = Math.round(rect.height * dpr);
      const layout = officeState.getLayout();
      const mapW = layout.cols * TILE_SIZE * zoom;
      const mapH = layout.rows * TILE_SIZE * zoom;
      const deviceOffsetX = Math.floor((canvasW - mapW) / 2) + Math.round(panRef.current?.x ?? 0);
      const deviceOffsetY = Math.floor((canvasH - mapH) / 2) + Math.round(panRef.current?.y ?? 0);
      const selectedId = officeState.selectedAgentId;
      const hoveredId = officeState.hoveredAgentId;

      setPositions(
        agents.flatMap((agent) => {
          const character = officeState.characters.get(agent.id);
          if (!character) {
            return [];
          }

          const isSelected = selectedId === agent.id;
          const isHovered = hoveredId === agent.id;
          const showDetail = agent.isActive || isSelected || isHovered;
          const sittingOffset = character.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0;
          const screenX = (deviceOffsetX + character.x * zoom) / dpr;
          const screenY =
            (deviceOffsetY + (character.y + sittingOffset - TOOL_OVERLAY_VERTICAL_OFFSET) * zoom) / dpr;

          return [
            {
              id: agent.id,
              name: agent.name,
              statusLabel: agent.statusLabel,
              activity: agent.activity,
              isActive: agent.isActive,
              showDetail,
              left: screenX,
              top: screenY - (showDetail ? 46 : 32),
            },
          ];
        }),
      );
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [agents, containerRef, officeState, panRef, zoom]);

  return (
    <>
      {positions.map((agent) => {
        return (
          <div
            key={agent.id}
            data-slot="pixel-office-agent-label"
            data-active={agent.isActive ? "true" : "false"}
            className="pointer-events-none absolute z-30 flex -translate-x-1/2 flex-col items-center"
            style={{
              left: agent.left,
              top: agent.top,
            }}
          >
            <div
              className={`max-w-[220px] border px-2.5 py-1.5 text-center font-[var(--font-pixel-agents)] shadow-[3px_3px_0_rgba(0,0,0,0.52)] ${
                agent.showDetail
                  ? "border-white/20 bg-[#121225]/95 text-white"
                  : "border-white/10 bg-black/70 text-white/82"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 shrink-0 ${agent.isActive ? "bg-[#3794ff]" : "bg-white/35"}`}
                  aria-hidden="true"
                />
                <span className="truncate text-[12px] leading-none">{agent.name}</span>
              </div>
              {agent.showDetail ? (
                <p className="mt-1 max-w-[198px] truncate text-[10px] leading-tight text-white/58">
                  {agent.isActive ? agent.activity : agent.statusLabel}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}

export function PixelAgentsOffice({ agents }: PixelAgentsOfficeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const [editorState] = useState(() => new EditorState());
  const [officeState, setOfficeState] = useState<OfficeState | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(2);

  useEffect(() => {
    setZoom(defaultZoom());
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadPixelOfficeAssets()
      .then(({ layout }) => {
        if (cancelled) {
          return;
        }
        setOfficeState(new OfficeState(cloneLayoutForOffice(layout)));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAssetError(error instanceof Error ? error.message : "Could not load Pixel Agents assets");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!officeState) {
      return;
    }

    const nextAgentIds = new Set(agents.map((agent) => agent.id));
    for (const character of officeState.getCharacters()) {
      if (!character.isSubagent && !nextAgentIds.has(character.id)) {
        officeState.removeAgent(character.id);
      }
    }

    for (const agent of agents) {
      if (!officeState.characters.has(agent.id)) {
        officeState.addAgent(agent.id, undefined, undefined, undefined, true, agent.name);
      }

      const character = officeState.characters.get(agent.id);
      if (character) {
        character.folderName = agent.name;
      }

      officeState.setAgentActive(agent.id, agent.isActive);
      officeState.setAgentTool(agent.id, agent.isActive ? agent.activeTool : null);
      if (!agent.isActive) {
        officeState.clearPermissionBubble(agent.id);
      }
    }
  }, [agents, officeState]);

  const handleZoomChange = useCallback((nextZoom: number) => {
    setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(nextZoom))));
  }, []);

  const noop = useCallback(() => {}, []);
  const noopTile = useCallback(() => {}, []);
  const noopDrag = useCallback(() => {}, []);

  if (assetError) {
    return (
      <div
        data-slot="pixel-agents-office-error"
        className="flex h-full min-h-[420px] items-center justify-center bg-[#11111e] px-6 text-center font-[var(--font-pixel-agents)] text-sm text-white/70"
      >
        Pixel Agents office failed to load.
      </div>
    );
  }

  if (!officeState) {
    return (
      <div
        data-slot="pixel-agents-office-loading"
        className="flex h-full min-h-[420px] items-center justify-center bg-[#11111e] font-[var(--font-pixel-agents)] text-sm text-white/70"
      >
        Loading Pixel Agents office...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-slot="pixel-agents-office"
      className="pixel-agents-office relative h-full min-h-[420px] overflow-hidden bg-[#1e1e2e]"
    >
      <OfficeCanvas
        officeState={officeState}
        onOpenAgentTerminal={noop}
        isEditMode={false}
        editorState={editorState}
        onEditorTileAction={noopTile}
        onEditorEraseAction={noopTile}
        onEditorSelectionChange={noop}
        onDeleteSelected={noop}
        onRotateSelected={noop}
        onDragMove={noopDrag}
        editorTick={0}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        panRef={panRef}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_52%,rgba(0,0,0,0.55)_100%)]" />
      <PixelOfficeZoomControls zoom={zoom} onZoomChange={handleZoomChange} />
      <PixelOfficeAgentOverlay
        officeState={officeState}
        agents={agents}
        containerRef={containerRef}
        zoom={zoom}
        panRef={panRef}
      />
    </div>
  );
}
