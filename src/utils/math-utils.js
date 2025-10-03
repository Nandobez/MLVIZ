function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function softmax(values) {
  if (!values.length) return [];
  const maxVal = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - maxVal));
  const sum = exps.reduce((acc, value) => acc + value, 0);
  return exps.map((value) => (sum === 0 ? 0 : value / sum));
}

function maxAbsValue(values) {
  let max = 0;
  for (let i = 0; i < values.length; i += 1) {
    const magnitude = Math.abs(values[i]);
    if (magnitude > max) {
      max = magnitude;
    }
  }
  return max;
}

export { clamp, softmax, maxAbsValue };
