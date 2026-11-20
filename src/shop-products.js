const groups = [
  [499, [
    ['Afnan', '9PM Rebel', '9pmrebel'],
    ['Rasasi', 'Hawas Ice', 'hawasice'],
    ['Versace', 'Eros Eau de Parfum', 'eroseaudeparfum'],
    ['Jean Paul Gaultier', 'Ultra Male', 'ultramale'],
    ['Carolina Herrera', '212 VIP Black', '212vipblack'],
    ['Carolina Herrera', 'Good Girl Eau de Parfum', 'goodgirleaudeparfum'],
  ]],
  [699, [
    ['Jean Paul Gaultier', 'Gaultier Divine', 'gaultierdivine'],
    ['Xerjoff', 'Erba Pura', 'erbapura'],
    ['Valentino Donna', 'Born in Roma Intense', 'valentinodonnaborninromaintense'],
    ['Paco Rabanne', 'Invictus Victory Elixir', 'invictusvictoryelixir', 'png'],
    ['Jean Paul Gaultier', 'Le Male Elixir', 'lemaleelixir'],
    ['Louis Vuitton', 'Imagination', 'imagination'],
    ['Giorgio Armani', 'Acqua di Giò Profondo', 'acquadigioprofondo'],
    ['Chanel', 'Coco Mademoiselle Intense', 'cocomademoiselleintense', 'png'],
    ['Emporio Armani', 'Stronger With You Absolutely', 'strongerwithyouabsolutely'],
  ]],
];

export const prices = groups.map(([price]) => price);
export const products = groups.flatMap(([price, entries]) =>
  entries.map(([brand, name, id, format = 'webp']) => ({brand, name, id, price, format}))
);
export const money = price => '$' + new Intl.NumberFormat('es-MX').format(price);
