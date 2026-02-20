function Toast({ message, visible }) {
  if (!visible) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50
        py-3 px-6 rounded-xl bg-slate-800 text-white text-mobile-lg font-medium
        shadow-lg animate-fade-in"
      role="status"
    >
      {message}
    </div>
  );
}

export default Toast;
