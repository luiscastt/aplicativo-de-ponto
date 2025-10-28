"use client";

import { toast } from "sonner";
import type { ToastId } from "@/types";

export const showSuccess = (message: string, options?: { id?: ToastId }) => {
  toast.success(message, options);
};

export const showError = (message: string, options?: { id?: ToastId }) => {
  toast.error(message, options);
};

export const showLoading = (message: string): ToastId => {
  return toast.loading(message) as ToastId;
};

export const dismissToast = (toastId: ToastId) => {
  toast.dismiss(toastId);
};