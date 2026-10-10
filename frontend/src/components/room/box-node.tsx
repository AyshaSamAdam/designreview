"use client";

import { Handle, Position, type NodeProps } from "reactflow";

export function BoxNode({ data }: NodeProps) {
  const hasNote = String(data?.note ?? "").trim().length > 0;

  return (
    <>
      <Handle type="target" position={Position.Top} />
      {String(data?.label ?? "")}
      {hasNote && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ position: "absolute", right: 3, bottom: 3 }}
        >
          <title>This box has a note</title>
          <path d="M4 4h16v12l-4 4H4z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      )}
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}