interface PlayerProps {
  open: boolean;
  onClose: () => void;
  fileUrl?: string;
}

export default function VideoPlayerModal({ open, onClose, fileUrl }: PlayerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl w-[900px] p-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Запись сессии</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-black text-2xl">
            ✕
          </button>
        </div>

        <video controls className="w-full rounded-lg">
          <source
            src={fileUrl || "https://www.w3schools.com/html/mov_bbb.mp4"}
            type="video/mp4"
          />
          Ваш браузер не поддерживает видео-плеер.
        </video>
      </div>
    </div>
  );
}
