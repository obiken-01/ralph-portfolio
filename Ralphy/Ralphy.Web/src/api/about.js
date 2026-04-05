import api from './axios'

export const getAboutProfile = () => api.get('/about')
export const sendContactMessage = (data) => api.post('/contact', data)
export const getContactMessages = () => api.get('/contact/messages')

export const uploadCv = (formData) =>
    api.post('/about/cv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

export const deleteCv = () => api.delete('/about/cv')

export const uploadProfileImage = (formData) =>
    api.post('/about/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  
  export const uploadCoverImage = (formData) =>
    api.post('/about/cover-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })