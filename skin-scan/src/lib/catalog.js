// Curated product library — trusted Korean skincare brands + dermatologist
// staples, organized by category and mapped to the concerns this app detects.
// Each entry explains HOW the product addresses the concern and the realistic
// TIMELINE to see results. General guidance, not medical advice.

export const CATEGORIES = {
  cleanser:   'Cleanser',
  toner:      'Toner',
  serum:      'Serum / Treatment',
  eye:        'Eye Care',
  moisturizer:'Moisturizer',
  sunscreen:  'Sunscreen',
  exfoliant:  'Mask / Exfoliant',
}

export const CATALOG = [
  // ── Pores ──────────────────────────────────────────────────────────────
  {
    id: 'cosrx-bha-power-liquid',
    brand: 'COSRX', name: 'BHA Blackhead Power Liquid', category: 'exfoliant',
    concerns: ['pores', 'blemishes'],
    keyIngredients: ['Betaine salicylate 4% (BHA)', 'Willow bark water', 'Niacinamide'],
    howItWorks: 'Oil-soluble BHA penetrates into pores and dissolves the sebum and dead-cell plugs that stretch them, so pores gradually appear smaller and blackheads loosen.',
    resultsTimeline: '2–4 weeks for visibly clearer pores; 6–8 weeks for refined texture.',
    usage: 'PM, start 2–3x/week and build to nightly. Apply after cleansing, before moisturizer.',
    cautions: 'Mild purging possible in the first 1–2 weeks. Use SPF daily.',
  },
  {
    id: 'paulas-choice-2bha',
    brand: "Paula's Choice", name: 'Skin Perfecting 2% BHA Liquid Exfoliant', category: 'exfoliant',
    concerns: ['pores', 'texture', 'blemishes'],
    keyIngredients: ['Salicylic acid 2%', 'Green tea extract'],
    howItWorks: 'Salicylic acid exfoliates inside the pore lining, clearing congestion and smoothing the surface; green tea calms the redness that comes with clogged pores.',
    resultsTimeline: 'Smoother feel in ~1 week; visibly smaller-looking pores in 2–6 weeks.',
    usage: 'Start PM 2–3x/week, increase to daily as tolerated.',
    cautions: 'Do not layer with strong retinoids on the same night at first.',
  },
  {
    id: 'anua-niacinamide-txa',
    brand: 'Anua', name: 'Niacinamide 10% + TXA 4% Serum', category: 'serum',
    concerns: ['pores', 'oiliness', 'texture'],
    keyIngredients: ['Niacinamide 10%', 'Tranexamic acid 4%'],
    howItWorks: 'Niacinamide regulates sebum production and strengthens the pore wall so pores look tighter; tranexamic acid fades the dark marks that make pores look bigger.',
    resultsTimeline: '4 weeks for reduced oiliness; 8–12 weeks for visibly refined pores and tone.',
    usage: 'AM and/or PM after toner.',
    cautions: 'High-percentage niacinamide can flush sensitive skin — start once daily.',
  },

  // ── Oiliness / shine ───────────────────────────────────────────────────
  {
    id: 'cerave-foaming-cleanser',
    brand: 'CeraVe', name: 'Foaming Facial Cleanser', category: 'cleanser',
    concerns: ['oiliness', 'blemishes'],
    keyIngredients: ['Ceramides', 'Niacinamide', 'Hyaluronic acid'],
    howItWorks: 'Gel-foam removes excess sebum without stripping the barrier — stripping triggers rebound oil, so a balanced cleanse actually reduces shine over time.',
    resultsTimeline: 'Less midday shine within 1–2 weeks of consistent AM/PM use.',
    usage: 'AM + PM as the first step.',
    cautions: null,
  },
  {
    id: 'innisfree-no-sebum',
    brand: 'innisfree', name: 'Super Volcanic Pore Clay Mask', category: 'exfoliant',
    concerns: ['oiliness', 'pores'],
    keyIngredients: ['Jeju volcanic clusters (clay)', 'AHA'],
    howItWorks: 'Clay physically absorbs excess surface sebum and lifts buildup out of the T-zone, giving an immediate matte effect and keeping pores from re-clogging.',
    resultsTimeline: 'Immediate matte finish after each use; steadier oil control in 2–3 weeks.',
    usage: '1–2x/week on T-zone or full face, 10 minutes, then rinse.',
    cautions: 'Over-use dries skin and rebounds oil — keep to twice a week max.',
  },
  {
    id: 'isntree-green-tea-gel',
    brand: 'Isntree', name: 'Green Tea Fresh Emulsion (oil-free gel)', category: 'moisturizer',
    concerns: ['oiliness'],
    keyIngredients: ['Green tea extract 50%', 'Hyaluronic acid'],
    howItWorks: 'Lightweight oil-free hydration: dehydrated skin over-produces sebum to compensate, so a water-gel moisturizer breaks the oily-but-dehydrated cycle.',
    resultsTimeline: 'Balanced, less greasy skin within 1–2 weeks.',
    usage: 'AM + PM after serums.',
    cautions: null,
  },

  // ── Redness ────────────────────────────────────────────────────────────
  {
    id: 'anua-heartleaf-toner',
    brand: 'Anua', name: 'Heartleaf 77% Soothing Toner', category: 'toner',
    concerns: ['redness'],
    keyIngredients: ['Houttuynia cordata (heartleaf) 77%', 'Panthenol'],
    howItWorks: 'Heartleaf is a calming anti-inflammatory botanical that settles reactive, flushed skin and reduces the irritation around the nose and cheeks.',
    resultsTimeline: 'Calmer skin within days; steadier reduction in baseline redness over 2–4 weeks.',
    usage: 'AM + PM after cleansing — pat in or use as a 3-minute soaked-pad compress on red areas.',
    cautions: null,
  },
  {
    id: 'skin1004-centella-ampoule',
    brand: 'SKIN1004', name: 'Madagascar Centella Ampoule', category: 'serum',
    concerns: ['redness', 'texture'],
    keyIngredients: ['Centella asiatica extract 100%'],
    howItWorks: 'Centella (cica) actives — madecassoside and asiaticoside — repair the skin barrier and dial down the inflammation that shows up as redness around the nose.',
    resultsTimeline: '1–2 weeks for visibly calmer skin; 4–8 weeks for a stronger, less reactive barrier.',
    usage: 'AM + PM after toner.',
    cautions: null,
  },
  {
    id: 'lrp-cicaplast-b5',
    brand: 'La Roche-Posay', name: 'Cicaplast Baume B5+', category: 'moisturizer',
    concerns: ['redness'],
    keyIngredients: ['Panthenol 5%', 'Madecassoside', 'Tribioma prebiotics'],
    howItWorks: 'A barrier-repair balm: panthenol and madecassoside rebuild the moisture barrier whose damage is the usual cause of persistent redness and flaking around the nose.',
    resultsTimeline: 'Soothing within 1–3 days on irritated patches; 2–4 weeks for lasting calm.',
    usage: 'PM as last step on red/irritated zones (or full face when skin is stressed).',
    cautions: null,
  },
  {
    id: 'to-azelaic-10',
    brand: 'The Ordinary', name: 'Azelaic Acid Suspension 10%', category: 'serum',
    concerns: ['redness', 'blemishes', 'texture'],
    keyIngredients: ['Azelaic acid 10%'],
    howItWorks: 'Azelaic acid is one of the best-evidenced ingredients for rosacea-type redness: it calms inflammation, kills blemish bacteria, and evens post-blemish marks.',
    resultsTimeline: '4 weeks for reduced redness; 8–12 weeks for full effect.',
    usage: 'PM (or AM under SPF), thin layer on affected areas.',
    cautions: 'Brief tingling is normal at first.',
  },

  // ── Dark circles ───────────────────────────────────────────────────────
  {
    id: 'to-caffeine-egcg',
    brand: 'The Ordinary', name: 'Caffeine Solution 5% + EGCG', category: 'eye',
    concerns: ['darkCircles'],
    keyIngredients: ['Caffeine 5%', 'EGCG (green tea catechin)'],
    howItWorks: 'Caffeine constricts the dilated under-eye blood vessels that read as blue-purple shadows and reduces fluid puffiness that casts its own shadow.',
    resultsTimeline: 'Less puffiness within days; vascular dark circles lighten over 4–8 weeks.',
    usage: 'AM + PM, a few drops patted under each eye.',
    cautions: 'Works best on vascular (bluish) circles; less on hollow-shadow or pigment types.',
  },
  {
    id: 'boj-revive-eye-serum',
    brand: 'Beauty of Joseon', name: 'Revive Eye Serum (Ginseng + Retinal)', category: 'eye',
    concerns: ['darkCircles', 'texture'],
    keyIngredients: ['Ginseng root extract', 'Retinal 2%'],
    howItWorks: 'Retinal thickens the thin under-eye skin and boosts collagen, so the dark vessels beneath show through less; ginseng improves microcirculation.',
    resultsTimeline: '4 weeks for brighter under-eyes; 8–12 weeks for firmer, less crepey skin.',
    usage: 'PM only, pea-sized amount for both eyes. Start 3x/week.',
    cautions: 'Mild flaking possible at first; buffer with moisturizer. Use SPF in the AM.',
  },

  // ── Texture ────────────────────────────────────────────────────────────
  {
    id: 'boj-glow-serum',
    brand: 'Beauty of Joseon', name: 'Glow Serum (Propolis + Niacinamide)', category: 'serum',
    concerns: ['texture', 'oiliness', 'blemishes'],
    keyIngredients: ['Propolis 60%', 'Niacinamide 2%'],
    howItWorks: 'Propolis calms and heals small bumps while niacinamide regulates oil and supports turnover, smoothing overall texture without irritation.',
    resultsTimeline: 'Glowier finish in ~1 week; smoother texture over 4–6 weeks.',
    usage: 'AM + PM after toner.',
    cautions: 'Skip if allergic to bee products.',
  },
  {
    id: 'roundlab-dokdo-toner',
    brand: 'Round Lab', name: '1025 Dokdo Toner', category: 'toner',
    concerns: ['texture', 'oiliness'],
    keyIngredients: ['Deep sea water minerals', 'Panthenol', 'Betaine'],
    howItWorks: 'A gentle daily hydrating toner that softens rough dead-cell buildup so texture smooths without acids — an ideal base layer for any routine.',
    resultsTimeline: 'Softer feel within days; refined texture in 2–4 weeks.',
    usage: 'AM + PM right after cleansing.',
    cautions: null,
  },

  // ── Blemishes ──────────────────────────────────────────────────────────
  {
    id: 'lrp-effaclar-duo',
    brand: 'La Roche-Posay', name: 'Effaclar Duo+M', category: 'serum',
    concerns: ['blemishes', 'pores'],
    keyIngredients: ['Niacinamide', 'Salicylic acid', 'LHA', 'Zinc PCA'],
    howItWorks: 'A targeted blemish treatment: LHA + salicylic acid unclog, zinc reduces sebum, niacinamide calms — clearing active spots and fading the marks they leave.',
    resultsTimeline: 'Active blemishes improve in 1–2 weeks; marks fade over 4–8 weeks.',
    usage: 'AM and/or PM on the whole face or affected zones.',
    cautions: null,
  },
  {
    id: 'cosrx-pimple-patch',
    brand: 'COSRX', name: 'Acne Pimple Master Patch', category: 'serum',
    concerns: ['blemishes'],
    keyIngredients: ['Hydrocolloid'],
    howItWorks: 'Hydrocolloid absorbs fluid from a whitehead overnight, flattens it faster, and physically blocks picking — which is what usually causes the lasting mark.',
    resultsTimeline: 'Visibly flattened spot overnight to 2 days.',
    usage: 'PM on clean, dry skin over the spot; remove in the morning.',
    cautions: 'For surface whiteheads, not deep cystic bumps.',
  },

  // ── Always: sunscreen ──────────────────────────────────────────────────
  {
    id: 'roundlab-birch-sunscreen',
    brand: 'Round Lab', name: 'Birch Juice Moisturizing Sun Cream SPF50+', category: 'sunscreen',
    concerns: ['always'],
    keyIngredients: ['SPF50+ PA++++', 'Birch sap', 'Hyaluronic acid'],
    howItWorks: 'UV is the #1 amplifier of every concern on this list — it enlarges pores, deepens dark circles, and worsens redness and marks. Daily SPF protects every other product\'s progress.',
    resultsTimeline: 'Preventive — benefits compound for as long as you use it daily.',
    usage: 'Every AM as the final step, two finger-lengths for the face.',
    cautions: null,
  },
  {
    id: 'boj-relief-sun',
    brand: 'Beauty of Joseon', name: 'Relief Sun: Rice + Probiotics SPF50+', category: 'sunscreen',
    concerns: ['always', 'redness'],
    keyIngredients: ['SPF50+ PA++++', 'Rice extract 30%', 'Probiotics'],
    howItWorks: 'A no-white-cast chemical sunscreen with skin-calming rice extract — protects against the UV that drives redness and pigment while feeling like a light moisturizer.',
    resultsTimeline: 'Preventive — daily use keeps redness and dark marks from worsening.',
    usage: 'Every AM as the final step; reapply if outdoors long.',
    cautions: null,
  },

  // ── Hydration support ──────────────────────────────────────────────────
  {
    id: 'torriden-dive-in-serum',
    brand: 'Torriden', name: 'DIVE-IN Low Molecular Hyaluronic Acid Serum', category: 'serum',
    concerns: ['texture', 'darkCircles'],
    keyIngredients: ['5 weights of hyaluronic acid', 'Panthenol', 'Allantoin'],
    howItWorks: 'Multi-weight hyaluronic acid plumps skin with water at several depths — plumper under-eye skin shows shadows less, and hydrated skin reads smoother.',
    resultsTimeline: 'Plumper look within days; cumulative smoothness over 2–4 weeks.',
    usage: 'AM + PM on damp skin, before moisturizer.',
    cautions: null,
  },
]

export function getProduct(id) {
  return CATALOG.find(p => p.id === id) || null
}

export function productsForConcern(concern, limit = 3) {
  return CATALOG.filter(p => p.concerns.includes(concern)).slice(0, limit)
}

// Compact list for the Claude prompt: id + name + what it targets.
export function catalogSummary() {
  return CATALOG.map(p => ({
    id: p.id,
    name: `${p.brand} ${p.name}`,
    category: p.category,
    concerns: p.concerns,
  }))
}
