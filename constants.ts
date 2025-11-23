export const MIN_SAMPLES_PER_CLASS = 3;
export const CLASS_COLORS = [
  '#ef4444', // Red
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

export const MODEL_DESCRIPTIONS = {
  CNN: "Uses TensorFlow.js with MobileNet Transfer Learning. Fast and runs entirely in your browser.",
  GEMINI: "Uses Google's Gemini 2.5 Flash. Extremely accurate with reasoning capabilities, but requires API calls.",
  SIMPLE: "A baseline statistical model checking average color distributions."
};