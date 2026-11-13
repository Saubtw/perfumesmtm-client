export const API_URL=(import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/,'');
export const catalogImage=path=>path==='/images/catalog/dolcegabbanaK.webp'?'/images/catalog/dolcegabbanak.webp':path;
export async function api(path,options={}) {
  const response=await fetch(`${API_URL}${path}`,{credentials:'include',...options,headers:{'Content-Type':'application/json',...options.headers}});
  if(!response.ok) {
    const data=await response.json().catch(()=>({}));const error=new Error(data.error?.message || 'No se pudo conectar con el servicio.');error.status=response.status;throw error;
  }
  return response.status===204?null:response.json();
}
export async function loadCatalog() {
  let page=1,total=Infinity;const items=[];
  while(items.length<total && page<=84) {
    const result=await api(`/perfumes?limit=120&page=${page++}`);
    if(!Array.isArray(result.items)||!Number.isInteger(result.total)) throw new Error('Respuesta del catálogo inválida.');
    total=result.total;items.push(...result.items);if(!result.items.length) break;
  }
  if(items.length<total) throw new Error('No se pudo cargar el catálogo completo.');
  return items.map(item=>({...item,image:catalogImage(item.image)}));
}
