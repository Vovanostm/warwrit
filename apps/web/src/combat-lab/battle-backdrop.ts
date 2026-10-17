import { Color3, ShaderMaterial, type Scene, type Texture } from '@babylonjs/core';

/** The authored place fades into its ground continuation rather than ending at a rectangle. */
export function createBattleBackdropMaterial(scene: Scene, texture: Texture) {
  const material = new ShaderMaterial(
    'old-mill-painted-values',
    scene,
    {
      vertexSource: `precision highp float;
      attribute vec3 position; attribute vec2 uv;
      uniform mat4 worldViewProjection; varying vec2 imageUv;
      void main(){imageUv=uv;gl_Position=worldViewProjection*vec4(position,1.0);}`,
      fragmentSource: `precision highp float;
      varying vec2 imageUv; uniform sampler2D placeMap; uniform vec3 tint;
      void main(){
        vec2 edges=min(imageUv,1.0-imageUv);
        float distance=min(edges.x,edges.y);
        float irregular=sin(imageUv.x*109.0+sin(imageUv.y*57.0))*0.008;
        float alpha=smoothstep(0.0,0.055,distance+irregular)*smoothstep(0.0,0.012,distance);
        vec4 art=texture2D(placeMap,imageUv);
        vec3 color=pow(pow(art.rgb,vec3(2.2))*tint,vec3(1.0/2.2));
        gl_FragColor=vec4(color,art.a*alpha);
      }`,
    },
    {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'tint'],
      samplers: ['placeMap'],
      needAlphaBlending: true,
    },
  );
  material.setTexture('placeMap', texture);
  material.setColor3('tint', Color3.White());
  material.disableDepthWrite = true;
  return material;
}
