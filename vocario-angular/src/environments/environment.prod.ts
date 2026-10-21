// Cấu hình môi trường Production cho Vercel Cloud Deployment
// Khi bạn deploy Backend (Spring Boot & FastAPI) lên Render / Railway / v.v.,
// hãy cập nhật URL tương ứng vào đây.
export const environment = {
  production: true,
  apiUrl: 'https://vocario-api.onrender.com/api',
  serverUrl: 'https://vocario-api.onrender.com',
  aiServiceUrl: 'https://vocario-ai.onrender.com'
};
