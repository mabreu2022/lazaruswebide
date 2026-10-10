import type { LComponent, LComponentType, AlignType } from '../types/lazarus';

export interface ComputedRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Checks if a component type acts as a parent container in Lazarus LCL
 */
export function isContainerComponent(type: LComponentType): boolean {
  return type === 'TPanel' || type === 'TGroupBox';
}

/**
 * Computes the layout rectangles of direct children within a container or form
 * implementing Lazarus LCL alignment rules: alTop, alBottom, alLeft, alRight, alClient, alNone
 */
export function computeContainerLayout(
  children: LComponent[],
  containerWidth: number,
  containerHeight: number,
  padding = { left: 0, top: 0, right: 0, bottom: 0 }
): Map<string, ComputedRect> {
  const result = new Map<string, ComputedRect>();

  let curLeft = padding.left;
  let curTop = padding.top;
  let curRight = Math.max(0, containerWidth - padding.right);
  let curBottom = Math.max(0, containerHeight - padding.bottom);

  // Filter only visible components (or non-visual badges)
  // In Lazarus, aligned components are ordered by creation or docking order.
  // We process in order: alTop, alBottom, alLeft, alRight, alClient, alNone.
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
 * Given all components on a form, compute effective layout bounds for all of them
 * by traversing root components and children of containers recursively.
 */
export function computeFullFormLayout(
  components: LComponent[],
  formWidth: number,
  formHeight: number
): Map<string, ComputedRect> {
  const allBounds = new Map<string, ComputedRect>();

  // 1. Root components (parentId is undefined or empty)
  const rootChildren = components.filter(c => !c.parentId);
  const rootLayout = computeContainerLayout(rootChildren, formWidth, formHeight);
  rootLayout.forEach((rect, id) => allBounds.set(id, rect));

  // 2. Container components direct children
  const containers = components.filter(c => isContainerComponent(c.type));
  for (const container of containers) {
    const containerRect = allBounds.get(container.id) || {
      left: container.left,
      top: container.top,
      width: container.width,
      height: container.height
    };

    const containerChildren = components.filter(c => c.parentId === container.id);
    const containerLayout = computeContainerLayout(
      containerChildren,
      containerRect.width,
      containerRect.height,
      container.type === 'TGroupBox' ? { left: 4, top: 18, right: 4, bottom: 4 } : { left: 2, top: 2, right: 2, bottom: 2 }
    );

    containerLayout.forEach((rect, id) => allBounds.set(id, rect));
  }

  return allBounds;
}
