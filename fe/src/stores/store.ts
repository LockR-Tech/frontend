import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from './baseAPi'
import i18n from '~/utils/i18n'

export const store = configureStore({
    reducer:{
        [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
    
});

// Chữ server đã dịch theo ngôn ngữ lúc tải (header X-App-Language) ⇒ đổi ngôn ngữ thì tải lại dữ liệu.
i18n.on('languageChanged', () => {
    store.dispatch(baseApi.util.resetApiState())
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

