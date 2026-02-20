import { useState, useMemo } from 'react';

// 지역/장소/상태별 하루 비용 범위 (원) - 순천 기준
const COST_MATRIX = {
  순천: {
    병원: { 기본: [120000, 150000], 중증: [150000, 180000] },
    재가: { 기본: [100000, 130000], 중증: [130000, 160000] },
  },
  광주: {
    병원: { 기본: [130000, 160000], 중증: [160000, 190000] },
    재가: { 기본: [110000, 140000], 중증: [140000, 170000] },
  },
  서울: {
    병원: { 기본: [150000, 190000], 중증: [190000, 230000] },
    재가: { 기본: [130000, 170000], 중증: [170000, 210000] },
  },
};

function CaregiverScreen({ onBack }) {
  const [region, setRegion] = useState('순천');
  const [location, setLocation] = useState('병원');
  const [status, setStatus] = useState('기본');
  const [days, setDays] = useState('7');

  const result = useMemo(() => {
    const matrix = COST_MATRIX[region] || COST_MATRIX['순천'];
    const loc = matrix[location] || matrix['병원'];
    const [min, max] = loc[status] || loc['기본'];
    const d = parseInt(days, 10) || 0;
    return {
      dailyMin: min,
      dailyMax: max,
      totalMin: min * d,
      totalMax: max * d,
    };
  }, [region, location, status, days]);

  const SelectButton = ({ value, selected, onClick, children }) => (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`py-3 px-4 text-mobile-lg font-medium rounded-xl transition-colors
        ${selected ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-700'}`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen px-5 pb-24 pt-6">
      <button
        onClick={onBack}
        className="text-mobile-lg text-teal-600 font-medium mb-6"
      >
        ← 홈으로
      </button>

      <h1 className="text-mobile-2xl font-bold text-teal-700 mb-2">
        간병비 계산기
      </h1>
      <p className="text-mobile-lg text-slate-600 mb-8">
        예상 비용을 확인하세요
      </p>

      <div className="space-y-6">
        {/* 지역 */}
        <div>
          <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">
            지역
          </label>
          <div className="flex flex-wrap gap-3">
            {['순천', '광주', '서울'].map((r) => (
              <SelectButton
                key={r}
                value={r}
                selected={region === r}
                onClick={setRegion}
              >
                {r}
              </SelectButton>
            ))}
          </div>
        </div>

        {/* 장소 */}
        <div>
          <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">
            장소
          </label>
          <div className="flex gap-3">
            <SelectButton
              value="병원"
              selected={location === '병원'}
              onClick={setLocation}
            >
              병원
            </SelectButton>
            <SelectButton
              value="재가"
              selected={location === '재가'}
              onClick={setLocation}
            >
              재가
            </SelectButton>
          </div>
        </div>

        {/* 상태 */}
        <div>
          <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">
            상태
          </label>
          <div className="flex gap-3">
            <SelectButton
              value="기본"
              selected={status === '기본'}
              onClick={setStatus}
            >
              기본
            </SelectButton>
            <SelectButton
              value="중증"
              selected={status === '중증'}
              onClick={setStatus}
            >
              중증
            </SelectButton>
          </div>
        </div>

        {/* 기간 */}
        <div>
          <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">
            기간 (일)
          </label>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value || '')}
            className="w-full py-4 px-4 text-mobile-xl rounded-xl border-2 border-slate-200"
          />
        </div>
      </div>

      {/* 결과 */}
      <div className="mt-10 p-6 bg-teal-50 rounded-2xl border border-teal-100">
        <h2 className="text-mobile-xl font-bold text-teal-700 mb-4">
          예상 비용
        </h2>
        <div className="space-y-4 text-mobile-lg">
          <div>
            <p className="text-slate-600 mb-1">하루 비용 범위</p>
            <p className="font-bold text-mobile-xl">
              {result.dailyMin.toLocaleString()}원 ~{' '}
              {result.dailyMax.toLocaleString()}원
            </p>
          </div>
          <div>
            <p className="text-slate-600 mb-1">총 예상 비용 ({days}일)</p>
            <p className="font-bold text-mobile-xl text-teal-600">
              {result.totalMin.toLocaleString()}원 ~{' '}
              {result.totalMax.toLocaleString()}원
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CaregiverScreen;
