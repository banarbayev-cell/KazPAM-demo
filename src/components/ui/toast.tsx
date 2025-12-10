interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  setTimeout(onClose, 2000); // закрытие через 2 секунды

  return (
    <div className="fixed top-4 right-4 bg-[#1A243F] text-white px-4 py-3 rounded-lg shadow-lg z-[9999]">
      {message}
    </div>
  );
}
