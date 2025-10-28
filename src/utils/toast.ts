"use client";

import { toast } from "sonner";

export const showSuccess = (message: string, options?: { id?: string }) => {
  toast.success(message, options);
};

export const showError = (message: string, options?: { id?: string }) => {
  toast.error(message, options);
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};