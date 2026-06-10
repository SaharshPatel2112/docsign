import { useRef } from "react";

interface Props {
  id: string;
  x: number;
  y: number;
  index: number;
  onRemove: (index: number) => void;
  onDrag: (id: string, x: number, y: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const SignatureField = ({
  id,
  x,
  y,
  index,
  onRemove,
  onDrag,
  containerRef,
}: Props) => {
  const isDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;

      onDrag(id, Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y)));
    };

    const onMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 10,
      }}
      className="group flex items-center gap-1"
    >
      <div
        onMouseDown={handleMouseDown}
        className="border-2 border-blue-500 bg-blue-500 bg-opacity-20 rounded px-3 py-1 text-xs text-blue-300 select-none cursor-grab active:cursor-grabbing"
      >
        ✍ Signature
      </div>
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        className="opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
      >
        ×
      </button>
    </div>
  );
};
