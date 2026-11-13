import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {restoreModelLabels} from './model-labels.js';

export function mountPerfumeScene(canvas,{reducedMotion=false}={}){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;}
  catch{document.documentElement.classList.add('webgl-fallback');return;}
  const scene=new THREE.Scene();
  // Broad studio reflections reveal the supplied metal/roughness maps.
  const pmrem=new THREE.PMREMGenerator(renderer),studio=new RoomEnvironment();
  const environment=pmrem.fromScene(studio,.04);scene.environment=environment.texture;
  studio.dispose();pmrem.dispose();
  const camera=new THREE.PerspectiveCamera(32,1,.1,100);camera.position.set(0,.1,8.4);
  scene.add(new THREE.HemisphereLight('#f7f2df','#283a30',2.7));
  const key=new THREE.DirectionalLight('#fff0d1',3.2);key.position.set(4,5,5);scene.add(key);
  const fill=new THREE.DirectionalLight('#b9cccb',2);fill.position.set(-4,1,3);scene.add(fill);
  const hero=canvas.closest('.hero');
  // Each model has its own lane, including a compact three-piece mobile composition.
  const models=[
    {url:'/models/hero-perfume.glb',label:'sauvage',auraColor:'163, 183, 193',desktop:[.18,.60,.52],mobile:[-.61,-1.10,.26],yaw:-.18,tilt:-.08},
    {url:'/models/hero-companion.glb',label:'valentino',auraColor:'187, 153, 161',desktop:[.70,-.12,.45],mobile:[.02,-1.42,.24],yaw:.18,tilt:.10},
    {url:'/models/hero-heel.glb',auraColor:'194, 180, 150',desktop:[.32,-1.16,.44],mobile:[.65,-1.02,.28],yaw:-.35,tilt:-.06}
  ].map(config=>{
    const group=new THREE.Group();scene.add(group);
    const aura=document.createElement('div');aura.className='model-aura';canvas.before(aura);
    aura.style.setProperty('--aura-color',config.auraColor);
    return {...config,group,aura,model:null,enteredAt:0};
  });
  const pointer=new THREE.Vector2(),projected=new THREE.Vector3();
  const onPointerMove=event=>{const rect=hero.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,(event.clientY-rect.top)/rect.height*2-1);};
  const onPointerLeave=()=>pointer.set(0,0);
  hero.addEventListener('pointermove',onPointerMove,{passive:true});hero.addEventListener('pointerleave',onPointerLeave);
  const title=canvas.closest('.hero').querySelector('#hero-title');
  const titleFill=title.querySelector('.hero-title-fill');
  // Invert the rendered model's alpha, so only letters over its actual silhouette open up.
  // Keep the mask small; the WebGL scene remains smooth independently.
  const mask=document.createElement('canvas'),maskContext=mask.getContext('2d');
  let lastMaskTime=-Infinity;
  function updateTitleMask(t){
    if(!models.some(item=>item.model)||!maskContext||t-lastMaskTime<1/24)return;
    lastMaskTime=t;
    const textRect=title.getBoundingClientRect(),sceneRect=canvas.getBoundingClientRect();
    if(!textRect.width||!textRect.height)return;
    const scale=Math.min(1,384/textRect.width);
    const width=Math.ceil(textRect.width*scale),height=Math.ceil(textRect.height*scale);
    if(mask.width!==width||mask.height!==height){mask.width=width;mask.height=height;}
    maskContext.globalCompositeOperation='source-over';
    maskContext.filter='none';maskContext.fillStyle='#fff';maskContext.fillRect(0,0,width,height);
    maskContext.globalCompositeOperation='destination-out';
    maskContext.globalAlpha=.93;
    maskContext.filter='blur(1px)';
    maskContext.drawImage(canvas,(sceneRect.left-textRect.left)*scale,(sceneRect.top-textRect.top)*scale,sceneRect.width*scale,sceneRect.height*scale);
    maskContext.globalAlpha=1;
    titleFill.style.setProperty('--model-cutout',`url("${mask.toDataURL()}")`);
  }
  let disposed=false,frame=0,visible=true;
  const resize=()=>{if(!canvas.clientWidth||!canvas.clientHeight)return;renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();renderer.render(scene,camera);};
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);resize();
  const visibilityObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{rootMargin:'100px'});visibilityObserver.observe(canvas);
  const loader=new GLTFLoader();
  for(const item of models)loader.load(item.url,gltf=>{
    if(disposed){disposeModel(gltf.scene);return;}const model=gltf.scene;item.model=model;
    const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    model.traverse(child=>{for(const material of [].concat(child.material??[])){for(const value of Object.values(material))if(value?.isTexture)value.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());material.envMapIntensity=.85;}});
    restoreModelLabels(model,item.label,renderer);
    const scale=3.65/Math.max(size.x,size.y,size.z);model.scale.setScalar(scale);model.position.sub(center.multiplyScalar(scale));item.group.add(model);item.enteredAt=elapsed;
    canvas.dataset.modelCount=String(models.filter(entry=>entry.model).length);canvas.dataset.modelReady='true';
  },undefined,()=>{item.aura.remove();if(models.every(entry=>!entry.model))document.documentElement.classList.add('webgl-fallback');});
  let previous=performance.now(),elapsed=0;
  function render(){if(disposed)return;frame=requestAnimationFrame(render);const now=performance.now(),delta=Math.min((now-previous)/1000,.05);previous=now;if(!visible||document.hidden)return;elapsed+=delta;const t=elapsed;
    const mobile=canvas.clientWidth<760;
    const halfWidth=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z*camera.aspect;
    models.forEach((item,index)=>{
    const {group:modelGroup,aura,model}=item;
    const phase=index*2.4;
    const enter=reducedMotion?1:1-Math.exp(-Math.max(0,t-item.enteredAt)*7);
    const [lane,baseY,scale]=mobile?item.mobile:item.desktop;
    const baseX=halfWidth*lane;
    modelGroup.scale.setScalar(scale*(.94+.06*enter));
    // Short, frame-rate-independent settling; no full turns or wide mechanical orbit.
    const follow=reducedMotion?1:1-Math.exp(-delta*11);
    const motion=reducedMotion?0:1;
    modelGroup.rotation.x=THREE.MathUtils.lerp(modelGroup.rotation.x,motion*(pointer.y*.09+Math.sin(t*.95+phase)*.045),follow);
    modelGroup.rotation.y=THREE.MathUtils.lerp(modelGroup.rotation.y,item.yaw+motion*(pointer.x*.5+Math.sin(t*.72+phase)*.30+(1-enter)*.5),follow);
    modelGroup.rotation.z=THREE.MathUtils.lerp(modelGroup.rotation.z,item.tilt+motion*(-pointer.x*.045+Math.sin(t*.85+phase)*.045),follow);
    modelGroup.position.set(baseX+motion*(pointer.x*.12+Math.sin(t*.78+phase)*(mobile?.045:.14)),baseY+motion*(Math.sin(t*1.22+phase)*.12-(1-enter)*.22),Math.sin(t*.6+phase)*.12*motion);
    projected.copy(modelGroup.position).project(camera);
    aura.style.transform=`translate3d(${(projected.x*.5+.5)*canvas.clientWidth}px,${(-projected.y*.5+.5)*canvas.clientHeight}px,0) translate(-50%,-50%)`;
    aura.style.opacity=model?String(.65*enter):'0';
    // Size the haze to the projected bottle, keeping mobile halos from merging.
    const pixelsPerUnit=canvas.clientHeight/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*(camera.position.z-modelGroup.position.z));
    const auraHeight=Math.round(3.65*scale*pixelsPerUnit*1.38);
    const auraWidth=Math.round(auraHeight*.82);
    if(aura.style.width!==`${auraWidth}px`)aura.style.width=`${auraWidth}px`;
    if(aura.style.height!==`${auraHeight}px`)aura.style.height=`${auraHeight}px`;
    });
    renderer.render(scene,camera);
    updateTitleMask(t);
  }
  render();
  function disposeModel(object){object.traverse(child=>{child.geometry?.dispose();for(const material of [].concat(child.material??[])){for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.userData.labelMap?.dispose();material.dispose();}});}
  window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();visibilityObserver.disconnect();hero.removeEventListener('pointermove',onPointerMove);hero.removeEventListener('pointerleave',onPointerLeave);for(const item of models){item.aura.remove();if(item.model)disposeModel(item.model);}environment.dispose();renderer.dispose();},{once:true});
}
