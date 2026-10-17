export const inkEarthShader = `
  vec3 linearizeRGB(vec3 color) {
    return pow(max(color, vec3(0.0)), vec3(2.2));
  }

  vec3 seamlessInkSample(sampler2D source, vec2 uv) {
    vec2 p = fract(uv);
    vec2 q = fract(uv + vec2(0.5));
    vec2 weight = smoothstep(vec2(0.0), vec2(0.2), p)
      * smoothstep(vec2(0.0), vec2(0.2), vec2(1.0) - p);

    vec3 pP = linearizeRGB(texture2D(source, p).rgb);
    vec3 qP = linearizeRGB(texture2D(source, vec2(q.x, p.y)).rgb);
    vec3 pQ = linearizeRGB(texture2D(source, vec2(p.x, q.y)).rgb);
    vec3 qQ = linearizeRGB(texture2D(source, q).rgb);
    vec3 lower = mix(qP, pP, weight.x);
    vec3 upper = mix(qQ, pQ, weight.x);
    return mix(upper, lower, weight.y);
  }

  vec3 inkEarth(vec2 uv) {
    float firstNoise = landNoise(uv * 0.23 + vec2(2.4, 8.1));
    float secondNoise = landNoise(uv * 0.23 + vec2(19.7, 3.3));
    float thirdNoise = landNoise(uv * 0.23 + vec2(40.5, 20.8));
    vec3 weights = exp((vec3(firstNoise, secondNoise, thirdNoise) - 0.5) * 10.0);
    weights /= dot(weights, vec3(1.0));

    vec3 first = seamlessInkSample(earthMap, uv);
    vec3 second = seamlessInkSample(earthVariantMap, uv*1.173+vec2(3.7,7.1));
    vec3 third = seamlessInkSample(earthThirdMap, uv*0.837+vec2(12.1,4.3));
    return first * weights.x + second * weights.y + third * weights.z;
  }
`;
