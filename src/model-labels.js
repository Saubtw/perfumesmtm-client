import * as THREE from 'three';

// Rebuild the lettering in model space. The source UV atlas splits individual
// letters over many islands, so sharpening that atlas also sharpens its defects.
const designs={
  sauvage:{bounds:[.035,.965,.10,.68],front:.65,height:2650,lines:[
    {text:'SAUVAGE',y:.30,size:300,font:'Times New Roman',spacing:12},
    {text:'EAU DE PARFUM',y:.44,size:88,font:'Arial',spacing:9},
    {text:'Dior',y:.83,size:360,font:'Times New Roman',spacing:0}
  ]},
  valentino:{bounds:[.055,.945,.265,.425],front:.63,height:620,lines:[
    {text:'VALENTINO',y:.51,size:205,font:'Times New Roman',spacing:6}
  ]}
};

function labelTexture(design){
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=design.height;
  const context=canvas.getContext('2d');
  context.fillStyle='#f7f3e9';context.textAlign='left';context.textBaseline='middle';
  for(const line of design.lines){
    context.font=`400 ${line.size}px "${line.font}"`;
    const letters=[...line.text];
    const width=letters.reduce((total,letter)=>total+context.measureText(letter).width,0)+line.spacing*(letters.length-1);
    let x=(canvas.width-width)/2;
    for(const letter of letters){context.fillText(letter,x,canvas.height*line.y);x+=context.measureText(letter).width+line.spacing;}
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=8;
  return texture;
}

export function restoreModelLabels(model,kind,renderer){
  const design=designs[kind];if(!design)return;
  const texture=labelTexture(design);
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  model.traverse(child=>{
    if(!child.isMesh)return;
    child.geometry.computeBoundingBox();
    const box=child.geometry.boundingBox;
    for(const material of [].concat(child.material)){
      // Store the extra map on the material so the scene's disposer owns it.
      material.userData.labelMap=texture;
      material.onBeforeCompile=shader=>{
        shader.uniforms.cleanLabel={value:texture};
        shader.uniforms.labelMin={value:box.min};
        shader.uniforms.labelSize={value:box.getSize(new THREE.Vector3())};
        shader.uniforms.labelBounds={value:new THREE.Vector4(...design.bounds)};
        shader.uniforms.labelFront={value:design.front};
        shader.uniforms.labelStyle={value:kind==='sauvage'?0:1};
        shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
          varying vec3 vLabelPosition;
          varying vec3 vCleanLabelNormal;`).replace('#include <begin_vertex>',`#include <begin_vertex>
          vLabelPosition = position;
          vCleanLabelNormal = normalize(normalMatrix * vec3(position.x * 1.2, 0.0, 1.0));`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
          varying vec3 vLabelPosition;
          varying vec3 vCleanLabelNormal;
          uniform sampler2D cleanLabel;
          uniform vec3 labelMin;
          uniform vec3 labelSize;
          uniform vec4 labelBounds;
          uniform float labelFront;
          uniform float labelStyle;
          float labelCoverage = 0.0;
        `).replace('#include <map_fragment>',`#include <map_fragment>
          vec3 labelPosition = (vLabelPosition - labelMin) / labelSize;
          vec2 labelUV = vec2(
            (labelPosition.x-labelBounds.x)/(labelBounds.y-labelBounds.x),
            (labelPosition.y-labelBounds.z)/(labelBounds.w-labelBounds.z)
          );
          vec2 edge = smoothstep(vec2(0.0),vec2(0.045),labelUV)
                    * smoothstep(vec2(0.0),vec2(0.045),1.0-labelUV);
          labelCoverage = edge.x*edge.y*smoothstep(labelFront,labelFront+0.06,labelPosition.z);
          vec4 lettering = texture2D(cleanLabel,labelUV);
          vec3 cleanSurface;
          if(labelStyle<0.5){
            cleanSurface=mix(vec3(0.018,0.115,0.26),vec3(0.0035,0.006,0.014),smoothstep(0.10,0.52,labelPosition.y));
          }else{
            cleanSurface=vec3(0.009,0.010,0.012);
          }
          diffuseColor.rgb=mix(diffuseColor.rgb,mix(cleanSurface,lettering.rgb,lettering.a),labelCoverage);
        `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
          // Remove the old letter-shaped normal relief as well as its color.
          normal=normalize(mix(normal,normalize(vCleanLabelNormal),labelCoverage));
        `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          roughnessFactor=mix(roughnessFactor,0.32,labelCoverage);
        `).replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
          metalnessFactor=mix(metalnessFactor,0.12,labelCoverage);
        `);
      };
      material.customProgramCacheKey=()=>`restored-label-${kind}`;
      material.needsUpdate=true;
    }
  });
}
