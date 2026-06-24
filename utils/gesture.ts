/**
 * ============================================
 * Utils: gesture
 * 职责：
 * - 触点命中判断（网格区域）
 * - 不依赖 Page / this
 * ============================================
 */

export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  
  /**
   * rect 内网格命中（1-based 行列）
   * @returns 是否命中指定 row/col 范围（闭区间）
   */
  export function hitGridByRect(
    rect: Rect | null,
    x: number,
    y: number,
    rows: number,
    cols: number,
    rowMin: number,
    rowMax: number,
    colMin: number,
    colMax: number
  ): boolean {
    if (!rect) return false;
  
    const rx = x - rect.left;
    const ry = y - rect.top;
    if (rx < 0 || ry < 0 || rx > rect.width || ry > rect.height) return false;
  
    const col = Math.floor((rx / rect.width) * cols) + 1;
    const row = Math.floor((ry / rect.height) * rows) + 1;
  
    return (
      row >= rowMin && row <= rowMax &&
      col >= colMin && col <= colMax
    );
  }
  
  /**
   * 全屏网格命中（不依赖 rect）
   * - 更适合被 transform 的容器（Main 屏）
   */
  export function hitGridFullScreen(
    x: number,
    y: number,
    winW: number,
    winH: number,
    rows: number,
    cols: number,
    rowMin: number,
    rowMax: number,
    colMin: number,
    colMax: number
  ): boolean {
    const col = Math.floor((x / winW) * cols) + 1;
    const row = Math.floor((y / winH) * rows) + 1;
  
    return (
      row >= rowMin && row <= rowMax &&
      col >= colMin && col <= colMax
    );
  }
  
  export default {
    hitGridByRect,
    hitGridFullScreen
  };
  