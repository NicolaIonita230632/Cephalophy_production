import { create } from 'zustand';
import { Landmark, ImageData, AnalysisStep } from '@/types';

interface LandmarkStore {
  // State
  landmarks: Landmark[];
  correctedLandmarks: Landmark[];
  selectedLandmark: string | null;
  currentImage: ImageData | null;
  analysisStep: AnalysisStep['step'];
  mmPerPixel: number;
  landmarkSize: number;
  isFullscreen: boolean;
  showLandmarkLabels: boolean;
  fileName: string;
  imageContrast: number;

  // Manual landmarks
  manualLandmarks: Landmark[];

  // Notes Generation State
  page1Notes: string;
  page2Notes: string;
  page3Notes: string;
  manualNotes: string;
  comparisonNotes: string;

  page1Images: string[];
  page2Images: string[];
  page3Images: string[];
  manualImages: string[];
  comparisonImages: string[];
  page3ImageUrl: string | null,

  page3ImageCaptions: string[];

  cephMeasurements: any[];
  compMeasures: any[];

  page1Frozen: boolean;
  page2Frozen: boolean;

  // Last selected analysis type
  lastAnalysisType: 'steiner' | 'planes' | 'custom';

  // Custom measurements
  customMeasurements: any[];

  // Actions
  setLandmarks: (landmarks: Landmark[]) => void;
  updateLandmark: (id: string, updates: Partial<Landmark>) => void;
  addCustomLandmark: (landmark: Landmark) => void;
  deleteLandmark: (id: string) => void;
  selectLandmark: (id: string | null) => void;

  // Corrected landmarks actions
  setCorrectedLandmarks: (landmarks: Landmark[]) => void;
  updateCorrectedLandmark: (id: string, updates: Partial<Landmark>) => void;
  addCorrectedCustomLandmark: (landmark: Landmark) => void;
  deleteCorrectedLandmark: (id: string) => void;

  // Manual landmark actions
  setManualLandmarks: (landmarks: Landmark[]) => void;
  addManualLandmark: (landmark: Landmark) => void;
  updateManualLandmark: (id: string, updates: Partial<Landmark>) => void;
  deleteManualLandmark: (id: string) => void;

  setCurrentImage: (image: ImageData) => void;
  setAnalysisStep: (step: AnalysisStep['step']) => void;
  setMmPerPixel: (ratio: number) => void;
  setLandmarkSize: (size: number) => void;
  setFullscreen: (fullscreen: boolean) => void;
  setShowLandmarkLabels: (show: boolean) => void;
  setFileName: (fileName: string) => void;
  setImageContrast: (contrast: number) => void;

  // Computed helpers
  resetAnalysis: () => void;

  // Notes
  setPage1Notes: (text: string) => void;
  setPage2Notes: (text: string) => void;
  setPage3Notes: (text: string) => void;
  setManualNotes: (text: string) => void;
  setComparisonNotes: (text: string) => void;

  setPage1Images: (urls: string[]) => void;
  setPage2Images: (urls: string[]) => void;
  setPage3Images: (urls: string[]) => void;
  setManualImages: (urls: string[]) => void;
  setComparisonImages: (urls: string[]) => void;
  setPage3ImageUrl: (url: string) => void,

  setPage3ImageCaptions: (captions: string[]) => void;

  addPage3Image: (url: string) => void;
  removePage3Image: (index: number) => void;

  setCephMeasurements: (m: any[]) => void;
  setCompMeasures: (m: any[]) => void;

  setPage1Frozen: (val: boolean) => void;
  setPage2Frozen: (val: boolean) => void;

  // Set last analysis type
  setLastAnalysisType: (type: 'steiner' | 'planes' | 'custom') => void;

  // Custom measurements actions
  setCustomMeasurements: (measurements: any[]) => void;
  addCustomMeasurement: (measurement: any) => void;
  removeCustomMeasurement: (id: string) => void;
}

export const useLandmarkStore = create<LandmarkStore>((set) => ({
  // Initial state
  landmarks: [],
  correctedLandmarks: [],
  selectedLandmark: null,
  currentImage: null,
  analysisStep: 'detection',
  mmPerPixel: 0.1,
  landmarkSize: 5,
  isFullscreen: false,
  showLandmarkLabels: true,
  fileName: '',
  imageContrast: 100,

  manualLandmarks: [],

  page1Notes: "",
  page2Notes: "",
  page3Notes: "",
  manualNotes: "",
  comparisonNotes: "",

  page1Images: [],
  page2Images: [],
  page3Images: [],
  manualImages: [],
  comparisonImages: [],
  page3ImageUrl: "",

  page3ImageCaptions: [],

  cephMeasurements: [],
  compMeasures: [],

  page1Frozen: false,
  page2Frozen: false,

  lastAnalysisType: 'steiner',

  customMeasurements: [],

  // Actions
  setLandmarks: (landmarks) => set({ landmarks }),

  updateLandmark: (id, updates) =>
    set((state) => ({
      landmarks: state.landmarks.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    })),

  addCustomLandmark: (landmark) =>
    set((state) => ({
      landmarks: [...state.landmarks, { ...landmark, isCustom: true }]
    })),

  deleteLandmark: (id) =>
    set((state) => ({
      landmarks: state.landmarks.filter((l) => l.id !== id),
      selectedLandmark: state.selectedLandmark === id ? null : state.selectedLandmark,
    })),

  selectLandmark: (id) => set({ selectedLandmark: id }),

  // Corrected landmarks actions
  setCorrectedLandmarks: (landmarks) => set({ correctedLandmarks: landmarks }),

  updateCorrectedLandmark: (id, updates) =>
    set((state) => ({
      correctedLandmarks: state.correctedLandmarks.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    })),

  addCorrectedCustomLandmark: (landmark) =>
    set((state) => ({
      correctedLandmarks: [...state.correctedLandmarks, { ...landmark, isCustom: true }]
    })),

  deleteCorrectedLandmark: (id) =>
    set((state) => ({
      correctedLandmarks: state.correctedLandmarks.filter((l) => l.id !== id),
    })),

  // Manual landmark actions
  setManualLandmarks: (landmarks) => set({ manualLandmarks: landmarks }),

  addManualLandmark: (landmark) =>
    set((state) => ({
      manualLandmarks: [...state.manualLandmarks.filter(lm => lm.name !== landmark.name), landmark]
    })),

  updateManualLandmark: (id, updates) =>
    set((state) => ({
      manualLandmarks: state.manualLandmarks.map((lm) =>
        lm.id === id ? { ...lm, ...updates } : lm
      ),
    })),

  deleteManualLandmark: (id) =>
    set((state) => ({
      manualLandmarks: state.manualLandmarks.filter((lm) => lm.id !== id),
    })),

  setCurrentImage: (image) => set({ currentImage: image }),

  setAnalysisStep: (step) => set({ analysisStep: step }),

  setMmPerPixel: (ratio) => set({ mmPerPixel: ratio }),

  setLandmarkSize: (size) => set({ landmarkSize: size }),

  setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),

  setShowLandmarkLabels: (show) => set({ showLandmarkLabels: show }),

  setFileName: (fileName) => set({ fileName }),

  setImageContrast: (contrast) => set({ imageContrast: contrast }),

  resetAnalysis: () => set({
    landmarks: [],
    selectedLandmark: null,
    currentImage: null,
    analysisStep: 'detection',
    mmPerPixel: 0.1,
    landmarkSize: 5,
    isFullscreen: false,
    fileName: '',
    imageContrast: 100,
  }),

  setPage1Notes: (text: string) => set({ page1Notes: text }),
  setPage2Notes: (text: string) => set({ page2Notes: text }),
  setPage3Notes: (text: string) => set({ page3Notes: text }),
  setManualNotes: (text: string) => set({ manualNotes: text }),
  setComparisonNotes: (text: string) => set({ comparisonNotes: text }),

  setPage1Images: (urls: string[]) => set({ page1Images: urls }),
  setPage2Images: (urls: string[]) => set({ page2Images: urls }),
  setPage3Images: (urls: string[]) => set({ page3Images: urls }),
  setManualImages: (text: string[]) => set({ manualImages: text }),
  setComparisonImages: (text: string[]) => set({ comparisonImages: text }),
  setPage3ImageUrl: (text: string) => set({ page3ImageUrl: text }),

  setPage3ImageCaptions: (captions: string[]) => set({ page3ImageCaptions: captions }),

  addPage3Image: (url: string) =>
    set((state) => ({ page3Images: [...state.page3Images, url] })),

  removePage3Image: (index: number) =>
    set((state) => ({ page3Images: state.page3Images.filter((_, i) => i !== index) })),

  setCephMeasurements: (m: any[]) => set({ cephMeasurements: m }),
  setCompMeasures: (m: any[]) => set({ compMeasures: m }),

  setPage1Frozen: (val) => set({ page1Frozen: val }),
  setPage2Frozen: (val) => set({ page2Frozen: val }),

  setLastAnalysisType: (type) => set({ lastAnalysisType: type }),

  // Custom measurements actions
  setCustomMeasurements: (measurements) => set({ customMeasurements: measurements }),

  addCustomMeasurement: (measurement) =>
    set((state) => ({
      customMeasurements: [...state.customMeasurements, measurement]
    })),

  removeCustomMeasurement: (id) =>
    set((state) => ({
      customMeasurements: state.customMeasurements.filter((m) => m.id !== id)
    })),
}));
