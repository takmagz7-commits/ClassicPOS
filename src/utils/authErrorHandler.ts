export const handleAuthError = () => {
  const currentPath = window.location.pathname;
  
  if (currentPath !== '/login') {
    window.location.href = '/login';
  }
};

export const isAuthError = (status: number): boolean => {
  return status === 401;
};
