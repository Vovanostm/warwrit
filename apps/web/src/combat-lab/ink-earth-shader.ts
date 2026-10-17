export const inkEarthShader = `
  vec3 linearizeRGB(vec3 color) {
    return pow(max(color, vec3(0.0)), vec3(2.2));
  }

  vec3 seamlessInkSample(sampler2D source, vec2 uv, vec2 dx, vec2 dy) {
    vec2 p = fract(uv);
    vec2 q = fract(uv + vec2(0.5));
    vec2 weight = smoothstep(vec2(0.0), vec2(0.2), p)
      * smoothstep(vec2(0.0), vec2(0.2), vec2(1.0) - p);

    vec3 pP = linearizeRGB(textureGrad(source, p, dx, dy).rgb);
    vec3 qP = linearizeRGB(textureGrad(source, vec2(q.x, p.y), dx, dy).rgb);
    vec3 pQ = linearizeRGB(textureGrad(source, vec2(p.x, q.y), dx, dy).rgb);
    vec3 qQ = linearizeRGB(textureGrad(source, q, dx, dy).rgb);
    vec3 lower = mix(qP, pP, weight.x);
    vec3 upper = mix(qQ, pQ, weight.x);
    return mix(upper, lower, weight.y);
  }

  vec3 inkPatch(vec2 uv, vec2 vertex, vec2 dx, vec2 dy, float detailWeight) {
    vec2 phase = hash2(vertex + vec2(18.7, 4.1));
    vec2 sampleUv = uv + phase * 29.0;
    if (detailWeight > 0.999) return seamlessInkSample(detailMap,sampleUv,dx,dy);
    vec3 soil=seamlessInkSample(earthMap,sampleUv,dx,dy);
    soil=mix(vec3(0.13,0.105,0.075),soil,0.55);
    if (detailWeight < 0.001) return soil;
    return mix(soil,seamlessInkSample(detailMap,sampleUv,dx,dy),detailWeight);
  }

  vec3 inkEarth(vec2 uv, float detailWeight) {
    // Derivatives precede phase wrapping and source branches, preventing false coarse mip seams.
    vec2 dx=dFdx(uv), dy=dFdy(uv);
    // Shared hashed vertices change both source and phase without rotating baked light.
    vec2 skew = vec2(uv.x-uv.y*0.57735027, uv.y*1.15470054)*2.0;
    vec2 base = floor(skew), f = fract(skew), a, b, c;
    vec3 weights;
    if (f.x+f.y<1.0) {
      a=base; b=base+vec2(1,0); c=base+vec2(0,1);
      weights=vec3(1.0-f.x-f.y,f.x,f.y);
    } else {
      a=base+vec2(1); b=base+vec2(0,1); c=base+vec2(1,0);
      weights=vec3(f.x+f.y-1.0,1.0-f.x,1.0-f.y);
    }
    vec3 first=inkPatch(uv,a,dx,dy,detailWeight), second=inkPatch(uv,b,dx,dy,detailWeight), third=inkPatch(uv,c,dx,dy,detailWeight);
    // Prefer ink shadow edges in overlap regions rather than washing out all three marks.
    vec3 lightness=vec3(dot(first,vec3(0.2126,0.7152,0.0722)),
      dot(second,vec3(0.2126,0.7152,0.0722)),dot(third,vec3(0.2126,0.7152,0.0722)));
    weights=weights*weights*weights*exp(-lightness*8.0);
    weights/=dot(weights,vec3(1.0));
    return first*weights.x+second*weights.y+third*weights.z;
  }
`;
