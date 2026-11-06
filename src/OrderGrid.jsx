import { useEffect, useRef } from "react";
import { WEEKDAYS, SLOTS_PER_DAY, gridPosition } from "./sampling.js";
import { waitColor } from "./colors.js";

const CELL = 7; // pixels per appointment
const DAY_GAP = 6; // pixels between days
const LEFT = 34;
const TOP = 22;
const DAY_W = SLOTS_PER_DAY * CELL;
const WIDTH = LEFT + WEEKDAYS.length * DAY_W + (WEEKDAYS.length - 1) * DAY_GAP + 4;
const HEIGHT = TOP + 100 * CELL + 4;

function cellX(col) {
  return LEFT + col * CELL + Math.floor(col / SLOTS_PER_DAY) * DAY_GAP;
}

// Main view: every appointment is one cell, in file order. Rows are weeks; columns are
// Mon slots 1-20, Tue slots 1-20, ... Fri slots 1-20. Sampled appointments are outlined.
export default function OrderGrid({ rows, sampledSet, maxWait, onHover }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#333";
    ctx.font = "12px sans-serif";
    ctx.textBaseline = "alphabetic";
    WEEKDAYS.forEach((d, k) => {
      ctx.textAlign = "center";
      ctx.fillText(d, cellX(k * SLOTS_PER_DAY) + DAY_W / 2, 14);
    });
    ctx.textAlign = "right";
    for (const wk of [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
      ctx.fillText(String(wk), LEFT - 6, TOP + (wk - 1) * CELL + CELL);
    }

    rows.forEach((row) => {
      const { gridRow, gridCol } = gridPosition(row);
      ctx.fillStyle = waitColor(row.wait_time, maxWait);
      ctx.fillRect(cellX(gridCol), TOP + gridRow * CELL, CELL - 1, CELL - 1);
    });

    // Outline sampled appointments (dark ring with a white inner ring, visible on any fill).
    rows.forEach((row, i) => {
      if (!sampledSet.has(i)) return;
      const { gridRow, gridCol } = gridPosition(row);
      const x = cellX(gridCol);
      const y = TOP + gridRow * CELL;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#000";
      ctx.strokeRect(x - 0.5, y - 0.5, CELL, CELL);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(x - 0.5, y - 0.5, CELL, CELL);
    });
  }, [rows, sampledSet, maxWait]);

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * WIDTH - LEFT;
    const my = ((e.clientY - rect.top) / rect.height) * HEIGHT - TOP;
    const day = Math.floor(mx / (DAY_W + DAY_GAP));
    const within = mx - day * (DAY_W + DAY_GAP);
    const gridRow = Math.floor(my / CELL);
    if (mx < 0 || my < 0 || day < 0 || day >= WEEKDAYS.length || within >= DAY_W || gridRow > 99) {
      onHover(null);
      return;
    }
    const gridCol = day * SLOTS_PER_DAY + Math.floor(within / CELL);
    onHover(gridRow * 100 + gridCol); // equals the 0-based row index in the file
  }

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      style={{ width: WIDTH, height: HEIGHT, maxWidth: "100%" }}
      onMouseMove={handleMove}
      onMouseLeave={() => onHover(null)}
    />
  );
}
