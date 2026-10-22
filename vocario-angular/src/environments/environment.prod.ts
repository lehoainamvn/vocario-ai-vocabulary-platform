// Cấu hình môi trường Production cho Vercel Cloud Deployment
// Đã kết nối với máy chủ Backend Spring Boot trên Render.com
export const environment = {
  production: true,
  apiUrl: 'https://vocario-backend.onrender.com/api',
  serverUrl: 'https://vocario-backend.onrender.com',
  aiServiceUrl: 'https://vocario-ai.onrender.com'
};
