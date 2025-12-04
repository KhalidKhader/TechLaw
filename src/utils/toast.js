import toast from 'react-hot-toast';

export const showSuccess = (message) => {
  toast.success(message, {
    duration: 3000,
    position: 'bottom-center',
  });
};

export const showError = (message) => {
  toast.error(message, {
    duration: 4000,
    position: 'bottom-center',
  });
};

export const showLoading = (message = 'Loading...') => {
  return toast.loading(message, {
    position: 'bottom-center',
  });
};

export const showInfo = (message) => {
  toast(message, {
    duration: 3000,
    position: 'bottom-center',
    icon: 'ℹ️',
  });
};

export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};
