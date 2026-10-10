import type { LComponent } from '../types/lazarus';
import { canAdoptChild, getContainerPadding, isContainerComponent } from './layoutEngine';
import type { ComputedRect } from './layoutEngine';

/**
 * Hierarquia Parent/Children do designer.
 *
 * O modelo guarda apenas `parentId` (fonte única da verdade). `children` e `isContainer`
 * são DERIVADOS, então nunca podem divergir da árvore real. O DOM do designer é gerado
 * a partir desse modelo (posição absoluta = posição do pai + área cliente + left/top local).
 */

/** Filhos diretos de um container, na ordem de Z-order (ordem do array). */
export function getChildren(components: LComponent[], parentId: string | undefined): LComponent[] {
  return components.filter(c => (c.parentId || undefined) === (parentId || undefined));
}

/** IDs ordenados dos filhos diretos (equivale à lista `children`/`Controls`). */
export function getChildrenIds(components: LComponent[], parentId: string | undefined): string[] {
  return getChildren(components, parentId).map(c => c.id);
}

/** Todos os descendentes (recursivo) de um conjunto de ids; protegido contra ciclos. */
export function getDescendantIds(components: LComponent[], rootIds: string[]): Set<string> {
  const result = new Set<string>();
  const queue = [...rootIds];
  while (queue.length) {
    const id = queue.shift()!;
    for (const c of components) {
      if (c.parentId === id && !result.has(c.id) && !rootIds.includes(c.id)) {
        result.add(c.id);
        queue.push(c.id);
      }
    }
  }
  return result;
}

/** Cadeia de ascendentes, do pai imediato até a raiz (o Form). */
export function getAncestorIds(components: LComponent[], id: string): string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let curr = components.find(c => c.id === id)?.parentId;
  while (curr && !seen.has(curr)) {
    chain.push(curr);
    seen.add(curr);
    curr = components.find(c => c.id === curr)?.parentId;
  }
  return chain;
}

/**
 * setParent(childId, newParentId): move o controle para outro container (ou para o Form
 * quando `newParentId` é undefined/null/'Form1'...). Retorna o NOVO array de componentes.
 *
 * - Impede ciclos (um controle nunca adota o próprio ascendente) e páginas fora do dono.
 * - Remove o filho do pai anterior e o adiciona ao novo (como último filho = topo do Z-order).
 * - Recalcula `left/top` locais para o controle continuar visualmente no mesmo lugar
 *   (a menos que `localPos` seja informado).
 */
export function setParent(
  components: LComponent[],
  childId: string,
  newParentId: string | null | undefined,
  layout?: Map<string, ComputedRect>,
  localPos?: { left: number; top: number }
): LComponent[] {
  const child = components.find(c => c.id === childId);
  if (!child) return components;

  const parent = newParentId ? components.find(c => c.id === newParentId) : undefined;
  if (newParentId && !parent) return components; // 'Form1' ou id desconhecido = raiz do form
  if (parent && !isContainerComponent(parent.type)) return components;
  if (!canAdoptChild(parent?.id, childId, components)) return components;

  let left = child.left;
  let top = child.top;
  if (localPos) {
    left = localPos.left;
    top = localPos.top;
  } else if (layout) {
    const abs = layout.get(childId);
    if (abs) {
      let baseLeft = 0;
      let baseTop = 0;
      if (parent) {
        const pRect = layout.get(parent.id);
        const pad = getContainerPadding(parent);
        baseLeft = (pRect?.absLeft ?? parent.left) + pad.left;
        baseTop = (pRect?.absTop ?? parent.top) + pad.top;
      }
      left = Math.round(abs.absLeft - baseLeft);
      top = Math.round(abs.absTop - baseTop);
    }
  }

  const moved: LComponent = { ...child, parentId: parent?.id, left, top };
  // remove do pai anterior e reanexa no fim (último filho)
  return [...components.filter(c => c.id !== childId), moved];
}

/** Remove os ids informados E todos os seus descendentes (exclusão em cascata). */
export function removeWithDescendants(
  components: LComponent[],
  ids: string[]
): { remaining: LComponent[]; removed: LComponent[] } {
  const doomed = getDescendantIds(components, ids);
  ids.forEach(i => doomed.add(i));
  return {
    remaining: components.filter(c => !doomed.has(c.id)),
    removed: components.filter(c => doomed.has(c.id))
  };
}
