export const products = [
  ["Afnan", "9PM Rebel", "9pmrebel", 499, 42],
  ["Carolina Herrera", "212 VIP Black", "212vipblack", 499, 44],
  ["Carolina Herrera", "Good Girl Eau de Parfum", "goodgirleaudeparfum", 499, 92],
  ["Chanel", "Coco Mademoiselle Intense", "cocomademoiselleintense", 699, 119],
  ["Emporio Armani", "Stronger With You Absolutely", "strongerwithyouabsolutely", 699, 67],
  ["Giorgio Armani", "Acqua di Giò Profondo", "acquadigioprofondo", 699, 65],
  ["Jean Paul Gaultier", "Gaultier Divine", "gaultierdivine", 699, 104],
  ["Jean Paul Gaultier", "Le Male Elixir", "lemaleelixir", 699, 22],
  ["Jean Paul Gaultier", "Ultra Male", "ultramale", 499, 24],
  ["Louis Vuitton", "Imagination", "imagination", 699, 30],
  ["Paco Rabanne", "Invictus Victory Elixir", "invictusvictoryelixir", 699, 68],
  ["Rasasi", "Hawas Ice", "hawasice", 499, 54],
  ["Valentino Donna", "Born in Roma Intense", "valentinodonnaborninromaintense", 699, 90],
  ["Versace", "Eros Eau de Parfum", "eroseaudeparfum", 499, 50],
  ["Xerjoff", "Erba Pura", "erbapura", 699, 75],
].map(([brand, name, id, price, catalogId]) => ({brand, name, id, price, catalogId}));

export const money = price => new Intl.NumberFormat("es-MX", {
  style: "currency", currency: "MXN", maximumFractionDigits: 0,
}).format(price);
