// Debug utility to verify API configuration
export const debugApiConfig = () => {
  console.group('🔍 API Configuration Debug');
  console.log('Environment:', import.meta.env.MODE);
  console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('Expected:', 'http://localhost:5000/api');

  if (import.meta.env.VITE_API_URL === 'http://localhost:5000/api') {
    console.log('✅ Configuration is CORRECT');
  } else {
    console.error('❌ Configuration is WRONG - Frontend will not connect to backend!');
    console.error('Please restart the dev server with: npm run dev');
  }
  console.groupEnd();
};

// Auto-run on development
if (import.meta.env.DEV) {
  debugApiConfig();
}
