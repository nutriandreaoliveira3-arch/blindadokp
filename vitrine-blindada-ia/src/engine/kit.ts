import type { CatalogItem, Finding, Product } from '../types';

// Kits montados com itens do catálogo: cada item é avaliado uma vez e a avaliação vale para todos os kits.

let n = 0;
const kid = () => `k${Date.now().toString(36)}${(n++).toString(36)}`;

function f(severity: 'alto' | 'atencao', policyIds: string[], title: string, explanation: string, suggestion?: string, humanReview?: boolean): Finding {
  return { id: kid(), detectorId: 'KIT', field: 'produto', severity, policyIds, title, explanation, suggestion, fixMode: 'manual', humanReview, origin: 'checklist' };
}

export const ITEM_STATUS: Record<CatalogItem['status'], { emoji: string; label: string }> = {
  aprovado: { emoji: '🟢', label: 'Liberado' },
  ressalva: { emoji: '🟡', label: 'Liberado com ressalva' },
  bloqueado: { emoji: '🔴', label: 'Bloqueado' },
  pendente: { emoji: '⚪', label: 'Pendente de avaliação' },
};

export function kitComponents(p: Product, items: CatalogItem[]) {
  return (p.components ?? []).map((c) => ({ ...c, item: items.find((i) => i.id === c.itemId) }));
}

/** Achados do kit para o portão do produto. */
export function kitFindings(p: Product, items: CatalogItem[]): Finding[] {
  const comps = kitComponents(p, items);
  if (!comps.length) return [];
  const out: Finding[] = [];
  for (const c of comps) {
    if (!c.item) {
      out.push(f('atencao', ['PR-1.1'], 'Item do kit não encontrado no catálogo', 'Um item do kit foi removido do catálogo.', 'Edite o kit.'));
      continue;
    }
    const i = c.item;
    if (i.status === 'bloqueado')
      out.push(f('alto', ['CP-3.5', 'CP-3.6', 'PR-1.1'], `Item bloqueado no kit: ${i.name}`, i.statusNote || 'Este item foi bloqueado na avaliação do catálogo.', 'Troque de kit ou resolva o motivo do bloqueio do item.'));
    if (i.status === 'pendente')
      out.push(f('atencao', ['PR-1.1'], `Item ainda não avaliado: ${i.name}`, 'Avalie o item no catálogo antes de criar conteúdo do kit.', 'Abra "Itens do catálogo" e conclua a avaliação.', true));
    if (i.status === 'ressalva')
      out.push(f('atencao', ['PR-1.1', 'CP-4.2'], `Ressalva do item: ${i.name}`, i.statusNote || 'Item liberado com ressalva.', i.avoid ? `Não falar: ${i.avoid.split('\n').filter(Boolean).join('; ')}` : undefined, true));
  }
  if (p.listingConsistency === 'diferente')
    out.push(f('alto', ['EV-4', 'PR-1.1', 'CP-3.10.1'], 'Imagem e descrição do anúncio mostram itens diferentes',
      'Se a imagem principal e a descrição do anúncio não batem, qualquer vídeo vai contradizer uma das duas. "Promoção de produto inconsistente" é o motivo que mais gerou pontos na conta.',
      'Peça ao vendedor para corrigir o anúncio antes de divulgar.'));
  if (!p.listingConsistency)
    out.push(f('atencao', ['EV-4', 'PR-1.1'], 'Conferir se imagem e descrição do anúncio batem',
      'Responda no cadastro se a imagem principal e a descrição do anúncio mostram os mesmos itens e quantidades.', undefined, true));
  return out;
}

/** Texto de especificações do kit a partir dos itens. */
export function kitSpecs(p: Product, items: CatalogItem[]) {
  return kitComponents(p, items)
    .filter((c) => c.item)
    .map((c) => `${c.qty}x ${c.item!.name}${c.item!.contents ? ` (${c.item!.contents})` : ''}`)
    .join('\n');
}

export function kitWarnings(p: Product, items: CatalogItem[]) {
  return [...new Set(kitComponents(p, items).flatMap((c) => (c.item?.warnings ?? '').split('\n').map((x) => x.trim()).filter(Boolean)))].join('\n');
}

/** Narração segura do kit, só com o que está no rótulo. */
export function kitNarration(p: Product, items: CatalogItem[]) {
  const comps = kitComponents(p, items).filter((c) => c.item);
  if (!comps.length) return '';
  const total = comps.reduce((a, c) => a + c.qty, 0);
  const parts = comps.map((c) => {
    const say = c.item!.safeToSay.split('\n').map((x) => x.trim()).filter(Boolean)[0];
    return `${c.qty > 1 ? c.qty + ' unidades de ' : ''}${say || c.item!.name + (c.item!.contents ? ', ' + c.item!.contents : '')}`;
  });
  return `${p.listingTitle || p.name}: kit com ${total} ${total > 1 ? 'itens' : 'item'}: ${parts.join('; ')}. O modo de uso está no rótulo de cada um. Toque no link do produto aqui no vídeo para ver o kit.`;
}

/** Descrição visual de cada item para o prompt de vídeo (fidelidade). */
export function kitVisual(p: Product, items: CatalogItem[]) {
  const comps = kitComponents(p, items).filter((c) => c.item);
  if (!comps.length) return [];
  const total = comps.reduce((a, c) => a + c.qty, 0);
  return [
    `This is a kit with exactly ${total} items, in this order: ${comps.map((c) => `${c.qty}x "${c.item!.labelText || c.item!.name}"${c.item!.visual ? ` (${c.item!.visual})` : ''}`).join('; ')}.`,
    `All ${total} items must be clearly visible together at least once; none missing, none added, no item from outside this list.`,
  ];
}

export function kitAvoid(p: Product, items: CatalogItem[]) {
  return [...new Set(kitComponents(p, items).flatMap((c) => (c.item?.avoid ?? '').split('\n').map((x) => x.trim()).filter(Boolean)))];
}
