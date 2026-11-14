import {combos} from './combos.js';
// This explicit owner-managed list is the only source of published offers.
export const promotions = combos.filter(combo=>combo.enabled);
export function setPromotions(items){promotions.splice(0,promotions.length,...items);}
export const money = value => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(value);
export const isPriced = product => Number.isSafeInteger(product?.price) && product.price > 0;
export function fixedProducts(promotion, catalog) {
  return promotion.products?.map(([brand,name])=>catalog.find(p=>p.brand===brand&&p.name===name)).filter(Boolean) ?? [];
}
export function createLine(ids, catalog, promotionId=null) {
  if(!Array.isArray(ids)||!ids.length) return null;
  const products=ids.map(id=>catalog.find(p=>p.id===String(id)));
  if(products.some(p=>!isPriced(p))) return null;
  const promotion=promotions.find(p=>p.id===promotionId);
  if(promotionId&&!promotion) return null;
  if(promotion) {
    if(products.length!==promotion.count) return null;
    const expected=fixedProducts(promotion,catalog).map(p=>p.id).sort();
    if(expected.length!==promotion.count||JSON.stringify([...ids].map(String).sort())!==JSON.stringify(expected)) return null;
  } else if(products.length!==1) return null;
  const regular=products.reduce((sum,p)=>sum+p.price,0);
  const price=promotion?.price ?? regular;
  if(price>regular) return null;
  const productIds=products.map(p=>p.id).sort();
  return {key:JSON.stringify([promotionId,productIds]),productIds,promotionId,products,promotion,regular,price,quantity:1};
}
export function restoreCart(value,catalog) {
  if(!Array.isArray(value)) return [];
  const lines=new Map();
  for(const raw of value.slice(0,200)) {
    if(!raw||!Number.isInteger(raw.quantity)||raw.quantity<1||raw.quantity>99) continue;
    const line=createLine(raw.productIds,catalog,raw.promotionId ?? null);
    // Preserve selections made with the removed builder, at individual prices.
    // They may no longer claim a discount for a composition the owner has not published.
    const legacyCounts={duo:2,trio:3,cuatro:4};
    const migrated=!line&&Array.isArray(raw.productIds)&&raw.productIds.length===legacyCounts[raw.promotionId]
      ?raw.productIds.map(id=>createLine([id],catalog)):[];
    const candidates=line?[line]:migrated.every(Boolean)?migrated:[];
    for(const candidate of candidates) {
      candidate.quantity=Math.min(99,(lines.get(candidate.key)?.quantity ?? 0)+raw.quantity);lines.set(candidate.key,candidate);
    }
  }
  return [...lines.values()];
}
export function cartTotals(lines) {
  return lines.reduce((sum,line)=>({count:sum.count+line.products.length*line.quantity,regular:sum.regular+line.regular*line.quantity,total:sum.total+line.price*line.quantity,savings:sum.savings+(line.regular-line.price)*line.quantity}),{count:0,regular:0,total:0,savings:0});
}
export function customerName(value) {
  const name=String(value??'').normalize('NFC').replace(/[\p{Cc}\p{Cf}*~_`"]+/gu,' ').replace(/\s+/g,' ').trim().slice(0,80);
  return /\p{L}/u.test(name)?name:'';
}
export function whatsappMessage(lines, name) {
  const customer=customerName(name);
  if(!lines.length||!customer) return '';
  const totals=cartTotals(lines);
  const details=lines.map(line=>{
    const products=new Map();
    for(const product of line.products) {
      const previous=products.get(product.id);
      products.set(product.id,{...product,quantity:(previous?.quantity??0)+line.quantity});
    }
    const items=[...products.values()].map(p=>`- *${p.brand} · ${p.name}*\n  Cantidad: ${p.quantity}\n  Unitario: ${money(p.price)}\n  Subtotal: ${money(p.price*p.quantity)}`).join('\n\n');
    return line.promotion?`_${line.promotion.name} · ${line.quantity} ${line.quantity===1?'combo':'combos'}_\n\n${items}\n\nPrecio del combo: ${money(line.price*line.quantity)}\nAhorro: ${money((line.regular-line.price)*line.quantity)}`:items;
  }).join('\n\n--------------------\n\n');
  return `*NUEVO PEDIDO DE "${customer}"*\n\n${details}\n\n--------------------\n\n${totals.savings?`Subtotal: ${money(totals.regular)}\nDescuento: ${money(totals.savings)}\n`:''}*Total: ${money(totals.total)} MXN*\n\nQuedo pendiente de la confirmación de mi pedido y ponernos de acuerdo con la entrega. Gracias.`;
}
export function whatsappUrl(lines, name) {
  const message=whatsappMessage(lines,name);
  return message ? `https://wa.me/528714750620?text=${encodeURIComponent(message)}` : null;
}
