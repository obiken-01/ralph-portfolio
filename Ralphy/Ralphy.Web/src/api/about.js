import api from './axios'

export const getAboutProfile = () => api.get('/about')
export const sendContactMessage = (data) => api.post('/contact', data)