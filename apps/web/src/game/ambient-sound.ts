export type SoundHabitat = 'meadow' | 'woodland' | 'wetland' | 'stone' | 'settlement';

/** Quiet synthesized ambience; no recording, witness, distant actor or gameplay event. */
export function createAmbientSound() {
  const context = new AudioContext();
  const output = context.createGain();
  output.gain.value = 0;
  output.connect(context.destination);
  const noise = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
  const data = noise.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + (Math.random() * 2 - 1) * 0.03) / 1.03;
    data[i] = last;
  }
  const wind = context.createBufferSource();
  wind.buffer = noise;
  wind.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 620;
  const bed = context.createGain();
  bed.gain.value = 0.35;
  wind.connect(filter).connect(bed).connect(output);
  wind.start();
  let habitat: SoundHabitat = 'stone',
    night = false,
    nextCall = 0;
  const calls = new Set<OscillatorNode>();
  function call(frequency: number, duration: number, strength: number, rising: boolean) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const at = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * (rising ? 1.55 : 0.66),
      at + duration * 0.6,
    );
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(strength, at + 0.025);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(envelope).connect(output);
    calls.add(oscillator);
    oscillator.onended = () => {
      calls.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(at);
    oscillator.stop(at + duration);
  }
  return {
    context,
    volume(value: number) {
      output.gain.setTargetAtTime(
        Math.max(0, Math.min(1, value)) * 0.32,
        context.currentTime,
        0.15,
      );
    },
    environment(place: SoundHabitat, dark: boolean) {
      if (place !== habitat || dark !== night) {
        for (const oscillator of calls) oscillator.stop();
        nextCall = context.currentTime + 3 + Math.random() * 4;
      }
      habitat = place;
      night = dark;
      filter.frequency.setTargetAtTime(habitatFrequency(place), context.currentTime, 1);
    },
    update() {
      const now = context.currentTime;
      bed.gain.setTargetAtTime(0.22 + Math.sin(now * 0.57) * 0.05, now, 0.5);
      if (context.state !== 'running' || now < nextCall) return;
      nextCall = now + 8 + Math.random() * 13;
      habitatCall();
    },
    dispose() {
      wind.stop();
      for (const oscillator of calls) oscillator.stop();
      void context.close();
    },
  };
  function habitatCall() {
    if (habitat === 'wetland') call(260 + Math.random() * 90, 0.3, 0.07, false);
    else if (!night) daytimeCall();
  }
  function daytimeCall() {
    if (['meadow', 'woodland'].includes(habitat)) birdCall();
    else if (habitat === 'settlement') call(430, 0.09, 0.035, false);
  }
  function birdCall() {
    call(1400 + Math.random() * 900, 0.15, 0.035, true);
    if (habitat === 'woodland') nextCall += 10;
  }
}

function habitatFrequency(place: SoundHabitat) {
  if (place === 'wetland') return 1100;
  return place === 'woodland' ? 420 : 620;
}
