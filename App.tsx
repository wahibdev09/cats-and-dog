import React, { useState, useEffect, useCallback } from 'react';
import { ClassItem, ModelType, PredictionResult, TrainingMetrics } from './types';
import { CLASS_COLORS, MIN_SAMPLES_PER_CLASS, MODEL_DESCRIPTIONS } from './constants';
import ClassCard from './components/ClassCard';
import WebcamCapture from './components/WebcamCapture';
import Metrics from './components/Metrics';
import { trainCNN, predictCNN, predictSimple, loadMobileNet } from './services/tensorService';
import { classifyWithGemini } from './services/geminiService';
import { Plus, Play, Brain, Sparkles, Activity, Camera, Upload, Image as ImageIcon } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [classes, setClasses] = useState<ClassItem[]>([
    { id: '1', name: 'Class 1', samples: [] },
    { id: '2', name: 'Class 2', samples: [] }
  ]);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isModelReady, setIsModelReady] = useState(false);
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetrics | null>(null);
  
  // Inference State
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [webcamActive, setWebcamActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Initialize TF
  useEffect(() => {
    loadMobileNet().catch(e => console.error("TF Load Error", e));
  }, []);

  // Handlers
  const addClass = () => {
    const newId = (classes.length + 1).toString();
    setClasses([...classes, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: `Class ${newId}`, 
      samples: [] 
    }]);
  };

  const updateClass = (updated: ClassItem) => {
    setClasses(classes.map(c => c.id === updated.id ? updated : c));
  };

  const deleteClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  const startTraining = async () => {
    // Validation
    const invalidClasses = classes.filter(c => c.samples.length < MIN_SAMPLES_PER_CLASS);
    if (invalidClasses.length > 0) {
      alert(`Each class needs at least ${MIN_SAMPLES_PER_CLASS} samples!`);
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);
    setIsModelReady(false);

    try {
      // Train CNN
      const metrics = await trainCNN(classes, (p) => setTrainingProgress(p));
      setTrainingMetrics(metrics);
      
      // "Simple" model doesn't need training, just data presence
      // Gemini doesn't need training, uses Zero/Few-shot
      
      setIsModelReady(true);
    } catch (e) {
      console.error(e);
      alert("Training failed. Check console.");
    } finally {
      setIsTraining(false);
    }
  };

  const handleInference = useCallback(async (base64: string) => {
    if (!isModelReady || isPredicting) return;
    setIsPredicting(true);

    // Run all models in parallel
    const cnnPromise = predictCNN(base64);
    const simplePromise = predictSimple(base64, classes);
    // Only run Gemini if API Key exists (checked inside service)
    const geminiPromise = classifyWithGemini(base64, classes);

    const [cnnRes, simpleRes, geminiRes] = await Promise.all([cnnPromise, simplePromise, geminiPromise]);

    setPredictions([
      { ...cnnRes, color: 'text-blue-400' },
      { ...simpleRes, color: 'text-amber-400' },
      { ...geminiRes, color: 'text-purple-400' }
    ]);

    setIsPredicting(false);
  }, [isModelReady, isPredicting, classes]);

  // Live Prediction Loop
  useEffect(() => {
    if (webcamActive && isModelReady && !isTraining) {
      const interval = setInterval(() => {
          // Trigger handled via child component callback, but we need a Ref mechanism or 
          // simply rely on the User clicking "Capture" for inference in this specific design 
          // to avoid API rate limits on Gemini.
          // However, for "Live", we usually only run the local models live and Gemini on demand.
          // For this demo, let's make it "Auto-Predict" only on local models, Gemini on button.
      }, 500);
      return () => clearInterval(interval);
    }
  }, [webcamActive, isModelReady, isTraining]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const result = ev.target.result as string;
          setUploadedImage(result);
          setWebcamActive(false); // Disable webcam if image is uploaded
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Brain className="text-indigo-500" size={28} />
             <h1 className="text-xl font-bold tracking-tight text-white">Neuro<span className="text-indigo-500">Classify</span></h1>
          </div>
          <div className="flex items-center gap-4">
             {isTraining && (
                <div className="flex items-center gap-3 bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700">
                    <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{width: `${trainingProgress}%`}}></div>
                    </div>
                    <span className="text-xs font-mono text-indigo-400">TRAINING {trainingProgress}%</span>
                </div>
             )}
             <button 
               onClick={startTraining}
               disabled={isTraining}
               className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
                 isModelReady 
                 ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                 : 'bg-indigo-600 hover:bg-indigo-500 text-white'
               } disabled:opacity-50 disabled:cursor-not-allowed`}
             >
               {isTraining ? <Activity className="animate-spin" size={18}/> : <Play size={18} fill="currentColor" />}
               {isModelReady ? 'Retrain Models' : 'Train Models'}
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Step 1: Data Collection */}
        <section className="mb-12">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">1. Class Definitions</h2>
                    <p className="text-slate-400 text-sm">Create classes and record samples (Min {MIN_SAMPLES_PER_CLASS} per class).</p>
                </div>
                <button onClick={addClass} className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                    <Plus size={16} /> Add Class
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((cls, idx) => (
                    <ClassCard 
                        key={cls.id} 
                        classItem={cls} 
                        color={CLASS_COLORS[idx % CLASS_COLORS.length]}
                        onUpdate={updateClass}
                        onDelete={deleteClass}
                        isTraining={isTraining}
                    />
                ))}
            </div>
        </section>

        {/* Step 2: Metrics */}
        {trainingMetrics && !isTraining && (
            <section className="mb-12 animate-fade-in">
                <Metrics metrics={trainingMetrics} />
            </section>
        )}

        {/* Step 3: Inference / Preview */}
        <section className={`transition-opacity duration-500 ${isModelReady ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">2. Live Preview & Comparison</h2>
                <p className="text-slate-400 text-sm">Test your models in real-time. Comparisons are shown side-by-side.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Input Source */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center">
                    <h3 className="text-lg font-semibold text-white mb-4 w-full">Input Source</h3>
                    <div className="w-full aspect-square bg-black rounded-lg overflow-hidden mb-4 relative flex items-center justify-center border border-slate-700/50">
                        {webcamActive ? (
                            <WebcamCapture 
                                active={true} 
                                onCapture={(b64) => handleInference(b64)} 
                                label="Live Feed"
                            />
                        ) : uploadedImage ? (
                            <img src={uploadedImage} alt="Upload Preview" className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                                <ImageIcon size={48} />
                                <span>No Input</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 w-full mb-3">
                        <button 
                            onClick={() => {
                                setWebcamActive(!webcamActive);
                                if (!webcamActive) setUploadedImage(null);
                            }}
                            className={`py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${webcamActive ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                        >
                            <Camera size={16} />
                            {webcamActive ? 'Stop Cam' : 'Camera'}
                        </button>
                        <label className="py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-sm cursor-pointer flex items-center justify-center gap-2 transition-colors">
                            <Upload size={16} />
                            <span>Upload</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleImageUpload}
                            />
                        </label>
                    </div>

                    <button 
                        onClick={() => {
                            if(webcamActive) {
                                const video = document.querySelector('video');
                                if(video) {
                                    const canvas = document.createElement('canvas');
                                    canvas.width = video.videoWidth;
                                    canvas.height = video.videoHeight;
                                    canvas.getContext('2d')?.drawImage(video, 0, 0);
                                    handleInference(canvas.toDataURL());
                                }
                            } else if (uploadedImage) {
                                handleInference(uploadedImage);
                            }
                        }}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={(!webcamActive && !uploadedImage) || isPredicting}
                    >
                        <Sparkles size={16} />
                        {isPredicting ? 'Analyzing...' : 'Predict Now'}
                    </button>
                </div>

                {/* Predictions */}
                <div className="lg:col-span-2 grid grid-cols-1 gap-4">
                    {predictions.length === 0 ? (
                        <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl text-slate-600">
                            Waiting for prediction...
                        </div>
                    ) : (
                        predictions.map((pred, idx) => (
                            <div key={idx} className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex flex-col md:flex-row gap-6 items-center shadow-lg relative overflow-hidden">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${pred.modelName === ModelType.GEMINI ? 'bg-purple-500' : pred.modelName === ModelType.CNN ? 'bg-blue-500' : 'bg-amber-500'}`} />
                                
                                <div className="flex-shrink-0 w-full md:w-48">
                                    <div className="flex items-center gap-2 mb-2">
                                        {pred.modelName === ModelType.GEMINI && <Sparkles size={16} className="text-purple-400" />}
                                        <h4 className={`font-bold ${pred.color}`}>{pred.modelName}</h4>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-tight">
                                        {pred.modelName === ModelType.CNN && MODEL_DESCRIPTIONS.CNN}
                                        {pred.modelName === ModelType.GEMINI && MODEL_DESCRIPTIONS.GEMINI}
                                        {pred.modelName === ModelType.SIMPLE && MODEL_DESCRIPTIONS.SIMPLE}
                                    </p>
                                </div>

                                <div className="flex-1 w-full">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-2xl font-black text-white">{pred.className}</span>
                                        <span className="text-lg font-mono text-slate-400">{(pred.confidence * 100).toFixed(1)}%</span>
                                    </div>
                                    
                                    {/* Confidence Bar */}
                                    <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${pred.modelName === ModelType.GEMINI ? 'bg-purple-500' : pred.modelName === ModelType.CNN ? 'bg-blue-500' : 'bg-amber-500'}`} 
                                            style={{ width: `${pred.confidence * 100}%` }}
                                        />
                                    </div>

                                    {pred.reasoning && (
                                        <div className="mt-3 bg-slate-900/50 p-3 rounded text-sm text-slate-300 italic border-l-2 border-slate-600">
                                            "{pred.reasoning}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </section>
      </main>
    </div>
  );
};

export default App;