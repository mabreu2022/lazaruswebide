import type { LComponent, LComponentType, AlignType } from '../types/lazarus';

export interface ComputedRect {
  left: number;       // Coordinate relative to parent container
  top: number;        // Coordinate relative to parent container
  width: number;      // Computed width
  height: number;     // Computed height
  absLeft: number;    // Absolute coordinate on form canvas
  absTop: number;     // Absolute coordinate on form canvas
}

export const CONTAINER_TYPES: LComponentType[] = [
  'TPanel',
  'TGroupBox',
  'TRadioGroup',
  'TFrame',
  'TPageControl',
  'TTabSheet',
  'TNotebook',
  'TPage',
  'TScrollBox',
  'TFlowPanel',
  'TGridPanel',
  'TPairSplitter',
  'TPairSplitterSide'
];

/**
 * Checks if a component type acts as a parent container in Lazarus LCL
 */
export function isContainerComponent(type: LComponentType): boolean {
  return CONTAINER_TYPES.includes(type);
}

/**
 * Checks if a container can adopt a child without causing a circular hierarchy
 */
export function canAdoptChild(
  candidateParentId: string | undefined,
  childId: string,
  components: LComponent[]
): boolean {
  if (!candidateParentId) return true; // Placing on Form root is always valid
  if (candidateParentId === childId) return false; // Cannot be parent of itself

  // Check if candidateParent is a descendant of childId
  let curr: string | undefined = candidateParentId;
  const visited = new Set<string>();

  while (curr) {
    if (curr === childId) return false; // Cycle detected!
    if (visited.has(curr)) break; // Guard against existing circular references
    visited.add(curr);

    const comp = components.find(c => c.id === curr);
    curr = comp?.parentId;
  }

  return true;
}

/**
 * Returns inner client area padding for container components
 */
export function getContainerPadding(container: LComponent): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  switch (container.type) {
    case 'TGroupBox':
    case 'TRadioGroup':
      // Has legend header at the top
      return { left: 8, top: 24, right: 8, bottom: 8 };
    case 'TPageControl':
      // Tabs header bar at top
      return { left: 4, top: 28, right: 4, bottom: 4 };
    case 'TNotebook':
      return { left: 4, top: 4, right: 4, bottom: 4 };
    case 'TTabSheet':
    case 'TPage':
      return { left: 4, top: 4, right: 4, bottom: 4 };
    case 'TPanel': {
      const bevelW = container.bevelWidth ?? 1;
      const pad =
        (container.bevelInner && container.bevelInner !== 'bvNone' ? bevelW : 0) +
        (container.bevelOuter && container.bevelOuter !== 'bvNone' ? bevelW : 0);
      const base = Math.max(2, pad);
      return { left: base, top: base, right: base, bottom: base };
    }
    case 'TFrame':
      return { left: 4, top: 4, right: 4, bottom: 4 };
    case 'TScrollBox':
      return { left: 4, top: 4, right: 4, bottom: 4 };
    case 'TFlowPanel':
      return { left: 6, top: 6, right: 6, bottom: 6 };
    case 'TGridPanel':
      return { left: 4, top: 4, right: 4, bottom: 4 };
    case 'TPairSplitter':
      return { left: 2, top: 2, right: 2, bottom: 2 };
    case 'TPairSplitterSide':
      return { left: 4, top: 4, right: 4, bottom: 4 };
    default:
      return { left: 2, top: 2, right: 2, bottom: 2 };
  }
}

/**
 * Computes layout for children inside a TFlowPanel (flex-like wrapping)
 */
function computeFlowLayout(
  children: LComponent[],
  availWidth: number,
  availHeight: number,
  flowLayout: 'tlLeftToRight' | 'tlTopToBottom' = 'tlLeftToRight'
): Map<string, { left: number; top: number; width: number; height: number }> {
  const result = new Map<string, { left: number; top: number; width: number; height: number }>();
  const gap = 4;

  if (flowLayout === 'tlTopToBottom') {
    let curX = 0;
    let curY = 0;
    let colWidth = 0;

    for (const comp of children) {
      const w = comp.width || 80;
      const h = comp.height || 30;

      if (curY + h > availHeight && curY > 0) {
        curX += colWidth + gap;
        curY = 0;
        colWidth = 0;
      }

      result.set(comp.id, { left: curX, top: curY, width: w, height: h });
      curY += h + gap;
      colWidth = Math.max(colWidth, w);
    }
  } else {
    let curX = 0;
    let curY = 0;
    let rowHeight = 0;

    for (const comp of children) {
      const w = comp.width || 80;
      const h = comp.height || 30;

      if (curX + w > availWidth && curX > 0) {
        curX = 0;
        curY += rowHeight + gap;
        rowHeight = 0;
      }

      result.set(comp.id, { left: curX, top: curY, width: w, height: h });
      curX += w + gap;
      rowHeight = Math.max(rowHeight, h);
    }
  }

  return result;
}

/**
 * Computes layout for children inside a TGridPanel (row x col matrix)
 */
function computeGridLayout(
  children: LComponent[],
  availWidth: number,
  availHeight: number,
  cols = 2,
  rows = 2
): Map<string, { left: number; top: number; width: number; height: number }> {
  const result = new Map<string, { left: number; top: number; width: number; height: number }>();
  const totalCols = Math.max(1, cols);
  const totalRows = Math.max(1, rows);
  const cellW = availWidth / totalCols;
  const cellH = availHeight / totalRows;

  children.forEach((comp, idx) => {
    const row = Math.floor(idx / totalCols);
    const col = idx % totalCols;
    const cellX = Math.round(col * cellW);
    const cellY = Math.round(row * cellH);

    if (comp.align === 'alClient') {
      result.set(comp.id, {
        left: cellX,
        top: cellY,
        width: Math.max(10, Math.round(cellW) - 2),
        height: Math.max(10, Math.round(cellH) - 2)
      });
    } else {
      const w = Math.min(comp.width || 80, Math.max(10, Math.round(cellW) - 2));
      const h = Math.min(comp.height || 30, Math.max(10, Math.round(cellH) - 2));
      result.set(comp.id, {
        left: cellX + Math.max(0, Math.round((cellW - w) / 2)),
        top: cellY + Math.max(0, Math.round((cellH - h) / 2)),
        width: w,
        height: h
      });
    }
  });

  return result;
}

/**
 * Computes layout for TPairSplitter (Side 1 and Side 2 separated by splitter bar)
 */
function computePairSplitterLayout(
  children: LComponent[],
  containerWidth: number,
  containerHeight: number,
  splitterPos?: number
): Map<string, { left: number; top: number; width: number; height: number }> {
  const result = new Map<string, { left: number; top: number; width: number; height: number }>();
  const splitPos = Math.max(20, Math.min(containerWidth - 20, splitterPos ?? Math.round(containerWidth / 2)));
  const barWidth = 6;

  if (children.length >= 1) {
    result.set(children[0].id, {
      left: 0,
      top: 0,
      width: Math.max(10, splitPos - Math.round(barWidth / 2)),
      height: containerHeight
    });
  }

  if (children.length >= 2) {
    const side2Left = splitPos + Math.round(barWidth / 2);
    result.set(children[1].id, {
      left: side2Left,
      top: 0,
      width: Math.max(10, containerWidth - side2Left),
      height: containerHeight
    });
  }

  for (let i = 2; i < children.length; i++) {
    result.set(children[i].id, {
      left: children[i].left,
      top: children[i].top,
      width: children[i].width,
      height: children[i].height
    });
  }

  return result;
}

/**
 * Computes standard Lazarus LCL alignment layout (alTop, alBottom, alLeft, alRight, alClient, alNone)
 */
export function computeContainerLayout(
  children: LComponent[],
  containerWidth: number,
  containerHeight: number,
  padding = { left: 0, top: 0, right: 0, bottom: 0 }
): Map<string, { left: number; top: number; width: number; height: number }> {
  const result = new Map<string, { left: number; top: number; width: number; height: number }>();

  let curLeft = padding.left;
  let curTop = padding.top;
  let curRight = Math.max(0, containerWidth - padding.right);
  let curBottom = Math.max(0, containerHeight - padding.bottom);

  const topComponents: LComponent[] = [];
  const bottomComponents: LComponent[] = [];
  const leftComponents: LComponent[] = [];
  const rightComponents: LComponent[] = [];
  const clientComponents: LComponent[] = [];
  const noneComponents: LComponent[] = [];

  for (const comp of children) {
    const align: AlignType = comp.align || 'alNone';
    switch (align) {
      case 'alTop':
        topComponents.push(comp);
        break;
      case 'alBottom':
        bottomComponents.push(comp);
        break;
      case 'alLeft':
        leftComponents.push(comp);
        break;
      case 'alRight':
        rightComponents.push(comp);
        break;
      case 'alClient':
        clientComponents.push(comp);
        break;
      default:
        noneComponents.push(comp);
        break;
    }
  }

  // 1. Process alTop components (stack from top down)
  for (const comp of topComponents) {
    const h = Math.min(comp.height || 30, Math.max(0, curBottom - curTop));
    result.set(comp.id, {
      left: curLeft,
      top: curTop,
      width: Math.max(0, curRight - curLeft),
      height: h
    });
    curTop += h;
  }

  // 2. Process alBottom components (stack from bottom up)
  for (const comp of bottomComponents) {
    const h = Math.min(comp.height || 30, Math.max(0, curBottom - curTop));
    const t = Math.max(curTop, curBottom - h);
    result.set(comp.id, {
      left: curLeft,
      top: t,
      width: Math.max(0, curRight - curLeft),
      height: h
    });
    curBottom -= h;
  }

  // 3. Process alLeft components (stack from left to right)
  for (const comp of leftComponents) {
    const w = Math.min(comp.width || 80, Math.max(0, curRight - curLeft));
    result.set(comp.id, {
      left: curLeft,
      top: curTop,
      width: w,
      height: Math.max(0, curBottom - curTop)
    });
    curLeft += w;
  }

  // 4. Process alRight components (stack from right to left)
  for (const comp of rightComponents) {
    const w = Math.min(comp.width || 80, Math.max(0, curRight - curLeft));
    const l = Math.max(curLeft, curRight - w);
    result.set(comp.id, {
      left: l,
      top: curTop,
      width: w,
      height: Math.max(0, curBottom - curTop)
    });
    curRight -= w;
  }

  // 5. Process alClient components (fills remaining client space)
  for (const comp of clientComponents) {
    result.set(comp.id, {
      left: curLeft,
      top: curTop,
      width: Math.max(0, curRight - curLeft),
      height: Math.max(0, curBottom - curTop)
    });
  }

  // 6. Process alNone components (keeps explicit left, top, width, height)
  for (const comp of noneComponents) {
    result.set(comp.id, {
      left: comp.left,
      top: comp.top,
      width: comp.width,
      height: comp.height
    });
  }

  return result;
}

/**
 * Given all components on a form, recursively compute absolute and local layout bounds
 * for arbitrary container nesting depth (Form -> Container -> SubContainer -> ...).
 */
export function computeFullFormLayout(
  components: LComponent[],
  formWidth: number,
  formHeight: number
): Map<string, ComputedRect> {
  const allBounds = new Map<string, ComputedRect>();
  const visited = new Set<string>();

  function layoutBranch(
    parentId: string | undefined,
    parentAbsX: number,
    parentAbsY: number,
    availWidth: number,
    availHeight: number,
    parentContainer?: LComponent
  ) {
    // Find all direct children
    const directChildren = components.filter(c =>
      parentId ? c.parentId === parentId : !c.parentId
    );

    if (directChildren.length === 0) return;

    let computedLocal: Map<string, { left: number; top: number; width: number; height: number }>;

    if (parentContainer?.type === 'TFlowPanel') {
      computedLocal = computeFlowLayout(
        directChildren,
        availWidth,
        availHeight,
        parentContainer.flowLayout || 'tlLeftToRight'
      );
    } else if (parentContainer?.type === 'TGridPanel') {
      computedLocal = computeGridLayout(
        directChildren,
        availWidth,
        availHeight,
        parentContainer.gridColumns ?? 2,
        parentContainer.gridRows ?? 2
      );
    } else if (parentContainer?.type === 'TPairSplitter') {
      computedLocal = computePairSplitterLayout(
        directChildren,
        availWidth,
        availHeight,
        parentContainer.splitterPosition
      );
    } else {
      computedLocal = computeContainerLayout(
        directChildren,
        availWidth,
        availHeight
      );
    }

    // Assign absolute bounds and recurse into child containers
    for (const child of directChildren) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);

      const localRect = computedLocal.get(child.id) || {
        left: child.left,
        top: child.top,
        width: child.width,
        height: child.height
      };

      const absLeft = parentAbsX + localRect.left;
      const absTop = parentAbsY + localRect.top;

      allBounds.set(child.id, {
        left: localRect.left,
        top: localRect.top,
        width: localRect.width,
        height: localRect.height,
        absLeft,
        absTop
      });

      // If child is a container, recurse into its inner client area
      if (isContainerComponent(child.type)) {
        const padding = getContainerPadding(child);
        const innerAbsX = absLeft + padding.left;
        const innerAbsY = absTop + padding.top;
        const innerWidth = Math.max(0, localRect.width - padding.left - padding.right);
        const innerHeight = Math.max(0, localRect.height - padding.top - padding.bottom);

        layoutBranch(
          child.id,
          innerAbsX,
          innerAbsY,
          innerWidth,
          innerHeight,
          child
        );
      }
    }
  }

  // 1. Start from Form root
  layoutBranch(undefined, 0, 0, formWidth, formHeight);

  // 2. Guard for any orphaned components whose parent was deleted or detached
  for (const comp of components) {
    if (!allBounds.has(comp.id)) {
      allBounds.set(comp.id, {
        left: comp.left,
        top: comp.top,
        width: comp.width,
        height: comp.height,
        absLeft: comp.left,
        absTop: comp.top
      });
    }
  }

  return allBounds;
}
