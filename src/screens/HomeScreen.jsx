function HomeScreen({ onSelectRole }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20">
      <h1 className="text-mobile-3xl font-bold text-teal-700 mb-2 text-center">
        CareNote MVP
      </h1>
      <p className="text-mobile-lg text-slate-600 mb-12 text-center">
        요양보호 서비스를 위한 기록 & 계산
      </p>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => onSelectRole('caregiver')}
          className="w-full py-5 px-6 text-mobile-xl font-semibold rounded-2xl
            bg-teal-500 text-white shadow-lg shadow-teal-200
            active:scale-[0.98] transition-transform"
        >
          보호자입니다
        </button>
        <button
          onClick={() => onSelectRole('careWorker')}
          className="w-full py-5 px-6 text-mobile-xl font-semibold rounded-2xl
            bg-teal-600 text-white shadow-lg shadow-teal-200
            active:scale-[0.98] transition-transform"
        >
          요양보호사입니다
        </button>
        <button
          onClick={() => onSelectRole('certificate')}
          className="w-full py-4 px-6 text-mobile-lg font-medium rounded-2xl
            bg-slate-200 text-slate-700 border-2 border-slate-300
            active:scale-[0.98] transition-transform"
        >
          경력증명서
        </button>
      </div>
    </div>
  );
}

export default HomeScreen;
