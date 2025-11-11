import { configureStore } from "@reduxjs/toolkit"
import pdfReducer from "./features/pdf-slice"

export const store = configureStore({
  reducer: {
    pdf: pdfReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
