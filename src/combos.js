// Lista manual de combos. Solo se publican entradas con enabled: true.
// Edita aquí los perfumes, el precio o el orden; no se generan paquetes automáticamente.
export const combos = [
  {id:'duo',enabled:true,name:'Cloud & Crystal',count:2,price:999,tone:'sage',description:'Dos favoritos para acompañarte cada día.',products:[['Ariana Grande','Cloud'],['Versace','Bright Crystal']]},
  {id:'pareja',enabled:true,name:'Sauvage & Good Girl',count:2,price:1199,tone:'rose',description:'Dos fragancias. Un detalle para compartir.',products:[['Dior','Sauvage Eau de Toilette'],['Carolina Herrera','Good Girl Eau de Parfum']]},
  {id:'dia-noche',enabled:true,name:'Y & Le Male',count:2,price:1199,tone:'brass',description:'Una combinación para distintos momentos.',products:[['Yves Saint Laurent','Y Eau de Parfum'],['Jean Paul Gaultier','Le Male Elixir']]},
  {id:'nicho',enabled:true,name:'Imagination & Baccarat',count:2,price:1399,tone:'brass',description:'Imagination y Baccarat Rouge 540, juntos.',onRequest:true,products:[['Louis Vuitton','Imagination'],['Maison Francis Kurkdjian','Baccarat Rouge 540']]},
  {id:'trio',enabled:true,name:'VIP · Cloud · Crystal',count:3,price:1399,tone:'sage',description:'Tres favoritos reunidos en un solo paquete.',products:[['Carolina Herrera','212 VIP Black'],['Ariana Grande','Cloud'],['Versace','Bright Crystal']]},
  {id:'citas',enabled:true,name:'Le Beau · Roma · Blush',count:3,price:1799,tone:'rose',description:'Una selección para regalar o quedártela.',products:[['Jean Paul Gaultier','Le Beau Le Parfum'],['Valentino Donna','Born in Roma Intense'],['Carolina Herrera','Good Girl Blush']]},
  {id:'cuatro',enabled:true,name:'Herrera · Cloud · Crystal',count:4,price:1999,tone:'sage',description:'Cuatro perfumes para ampliar tu colección.',products:[['Carolina Herrera','212 VIP Black'],['Carolina Herrera','Good Girl Eau de Parfum'],['Ariana Grande','Cloud'],['Versace','Bright Crystal']]},
  {id:'premium',enabled:true,name:'Imagination · Baccarat · Tobacco',count:3,price:2099,tone:'brass',description:'Imagination, Baccarat Rouge 540 y Tobacco Vanille.',onRequest:true,products:[['Louis Vuitton','Imagination'],['Maison Francis Kurkdjian','Baccarat Rouge 540'],['Tom Ford','Tobacco Vanille']]}
];
