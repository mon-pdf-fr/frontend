import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface PDFFile {
  id: string
  name: string
  file: File
  preview?: string
  pages?: number
}

interface PDFState {
  files: PDFFile[]
  selectedFiles: string[]
  processing: boolean
  currentTool: "split" | "merge" | "image-to-pdf" | "add-text" | null
}

const initialState: PDFState = {
  files: [],
  selectedFiles: [],
  processing: false,
  currentTool: null,
}

const pdfSlice = createSlice({
  name: "pdf",
  initialState,
  reducers: {
    addFiles: (state, action: PayloadAction<PDFFile[]>) => {
      state.files = [...state.files, ...action.payload]
    },
    removeFile: (state, action: PayloadAction<string>) => {
      state.files = state.files.filter((file) => file.id !== action.payload)
      state.selectedFiles = state.selectedFiles.filter((id) => id !== action.payload)
    },
    clearFiles: (state) => {
      state.files = []
      state.selectedFiles = []
    },
    toggleFileSelection: (state, action: PayloadAction<string>) => {
      const index = state.selectedFiles.indexOf(action.payload)
      if (index > -1) {
        state.selectedFiles.splice(index, 1)
      } else {
        state.selectedFiles.push(action.payload)
      }
    },
    selectAllFiles: (state) => {
      state.selectedFiles = state.files.map((file) => file.id)
    },
    deselectAllFiles: (state) => {
      state.selectedFiles = []
    },
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.processing = action.payload
    },
    setCurrentTool: (state, action: PayloadAction<PDFState["currentTool"]>) => {
      state.currentTool = action.payload
    },
  },
})

export const {
  addFiles,
  removeFile,
  clearFiles,
  toggleFileSelection,
  selectAllFiles,
  deselectAllFiles,
  setProcessing,
  setCurrentTool,
} = pdfSlice.actions

export default pdfSlice.reducer
