import { useState, useMemo, useEffect } from 'react';
import { saveRecords, loadRecords } from '../utils/storage';
import { formatWon, formatManwon } from '../utils/format';
import Toast from '../components/Toast';

const PRESETS = [
  { label: '병원 주간 기본', workType: '병원', workHours: '주간', patientStatus: '기본', payWon: 110000 },
  { label: '병원 야간 치매', workType: '병원', workHours: '야간', patientStatus: '치매', payWon: 120000 },
];

const AMOUNT_STEPS = [
  { label: '-5만', delta: -50000 },
  { label: '-1만', delta: -10000 },
  { label: '+1천', delta: 1000 },
  { label: '+1만', delta: 10000 },
  { label: '+5만', delta: 50000 },
  { label: '+10만', delta: 100000 },
];

function CareWorkerScreen({ onBack, onGoToCertificate }) {
  const today = new Date().toISOString().slice(0, 10);

  const [inputMode, setInputMode] = useState('day'); // 'day' | 'case'
  const [date, setDate] = useState(today);
  const [workType, setWorkType] = useState(null);
  const [workHours, setWorkHours] = useState(null);
  const [patientStatus, setPatientStatus] = useState(null);
  const [payWon, setPayWon] = useState(0);
  const [records, setRecords] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('저장 완료');
  const [selectedMonth, setSelectedMonth] = useState('this');

  useEffect(() => {
    const loaded = loadRecords();
    setRecords(loaded);
  }, []);

  useEffect(() => {
    if (records.length > 0) {
      saveRecords(records);
    }
  }, [records]);

  useEffect(() => {
    if (!toastVisible) return;
    const t = setTimeout(() => setToastVisible(false), 2500);
    return () => clearTimeout(t);
  }, [toastVisible]);

  const dayRecords = useMemo(() => records.filter((r) => (r.type || 'day') === 'day'), [records]);
  const caseRecords = useMemo(() => records.filter((r) => r.type === 'case'), [records]);
  const activeCase = useMemo(() => caseRecords.find((c) => !c.endDate) ?? null, [caseRecords]);
  const completedCases = useMemo(
    () => caseRecords.filter((c) => c.endDate).sort((a, b) => (b.endDate > a.endDate ? 1 : -1)),
    [caseRecords]
  );

  const resetForm = () => {
    setDate(today);
    setWorkType(null);
    setWorkHours(null);
    setPatientStatus(null);
    setPayWon(0);
  };

  const adjustPayWon = (delta) => {
    setPayWon((prev) => Math.max(0, prev + delta));
  };

  const handleDirectInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setPayWon(raw === '' ? 0 : Math.max(0, parseInt(raw, 10)));
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  const handleSave = () => {
    if (!workType || !workHours || !patientStatus) return;
    if (payWon <= 0) return;

    const newRecord = {
      type: 'day',
      id: Date.now(),
      date,
      workType,
      workHours,
      patientStatus,
      payWon,
    };
    setRecords((prev) => {
      const next = [...prev, newRecord];
      try {
        saveRecords(next);
      } catch (_) {}
      return next;
    });
    setLastSaved(newRecord);
    resetForm();
    showToast('저장 완료');
  };

  const handleAddSameDay = () => {
    if (!lastSaved) return;

    const d = new Date(lastSaved.date);
    d.setDate(d.getDate() + 1);
    const nextDate = d.toISOString().slice(0, 10);

    const newRecord = {
      type: 'day',
      id: Date.now(),
      date: nextDate,
      workType: lastSaved.workType,
      workHours: lastSaved.workHours,
      patientStatus: lastSaved.patientStatus,
      payWon: lastSaved.payWon,
    };
    setRecords((prev) => {
      const next = [...prev, newRecord];
      try {
        saveRecords(next);
      } catch (_) {}
      return next;
    });
    setLastSaved(newRecord);
    setDate(nextDate);
    setWorkType(lastSaved.workType);
    setWorkHours(lastSaved.workHours);
    setPatientStatus(lastSaved.patientStatus);
    setPayWon(lastSaved.payWon);
    showToast('저장 완료');
  };

  const applyPreset = (preset) => {
    setWorkType(preset.workType);
    setWorkHours(preset.workHours);
    setPatientStatus(preset.patientStatus);
    setPayWon(preset.payWon);
  };

  const handleQuickSave = () => {
    if (!lastRecord) return;

    const newRecord = {
      type: 'day',
      id: Date.now(),
      date: today,
      workType: lastRecord.workType,
      workHours: lastRecord.workHours,
      patientStatus: lastRecord.patientStatus,
      payWon: lastRecord.payWon ?? 0,
    };
    setRecords((prev) => {
      const next = [...prev, newRecord];
      try {
        saveRecords(next);
      } catch (_) {}
      return next;
    });
    setLastSaved(newRecord);
    resetForm();
    showToast('저장 완료');
  };

  const handleCaseStart = () => {
    if (!workType || !patientStatus || payWon <= 0) return;
    if (activeCase) return;

    const newCase = {
      type: 'case',
      id: Date.now(),
      startDate: date,
      endDate: null,
      workPlaceType: workType,
      workHours: workHours || '24시간',
      patientStatus,
      payWon,
      daysWorked: [],
    };
    setRecords((prev) => {
      const next = [...prev, newCase];
      try {
        saveRecords(next);
      } catch (_) {}
      return next;
    });
    resetForm();
    setWorkHours('24시간');
    showToast('근무 시작');
  };

  const handleAddTodayToCase = () => {
    if (!activeCase) return;

    const hasToday = activeCase.daysWorked?.includes(today);
    if (hasToday) {
      showToast('이미 오늘 기록이 있어요');
      return;
    }

    setRecords((prev) =>
      prev.map((r) =>
        r.id === activeCase.id
          ? { ...r, daysWorked: [...(r.daysWorked || []), today].sort() }
          : r
      )
    );
    showToast('오늘 기록 완료');
  };

  const handleCloseCase = () => {
    if (!activeCase) return;

    setRecords((prev) =>
      prev.map((r) =>
        r.id === activeCase.id ? { ...r, endDate: today } : r
      )
    );
    showToast('근무 마감');
  };

  const { year, month } = useMemo(() => {
    const now = new Date();
    if (selectedMonth === 'last') {
      now.setMonth(now.getMonth() - 1);
    }
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [selectedMonth]);

  const monthStats = useMemo(() => {
    const monthDayRecords = dayRecords.filter((r) => {
      const [rYear, rMonth] = r.date.split('-').map(Number);
      return rYear === year && rMonth === month;
    });
    const dayWorkDays = monthDayRecords.length;
    const dayIncome = monthDayRecords.reduce((sum, r) => sum + (r.payWon ?? 0), 0);

    let caseWorkDays = 0;
    let caseIncome = 0;

    caseRecords.forEach((c) => {
      const daysInMonth = (c.daysWorked || []).filter((d) => {
        const [y, m] = d.split('-').map(Number);
        return y === year && m === month;
      });
      caseWorkDays += daysInMonth.length;
      caseIncome += daysInMonth.length * (c.payWon ?? 0);
    });

    const totalWorkDays = dayWorkDays + caseWorkDays;
    const totalIncome = dayIncome + caseIncome;
    const avgWage = totalWorkDays > 0 ? Math.round(totalIncome / totalWorkDays) : 0;

    const dayRecordsForAvg = monthDayRecords.filter((r) => r.workHours === '주간');
    const nightRecordsForAvg = monthDayRecords.filter((r) => r.workHours === '야간');
    const caseDayIncome = caseRecords
      .filter((c) => c.workHours === '주간')
      .reduce((sum, c) => {
        const daysInMonth = (c.daysWorked || []).filter((d) => {
          const [y, m] = d.split('-').map(Number);
          return y === year && m === month;
        });
        return sum + daysInMonth.length * (c.payWon ?? 0);
      }, 0);
    const caseNightIncome = caseRecords
      .filter((c) => c.workHours === '야간')
      .reduce((sum, c) => {
        const daysInMonth = (c.daysWorked || []).filter((d) => {
          const [y, m] = d.split('-').map(Number);
          return y === year && m === month;
        });
        return sum + daysInMonth.length * (c.payWon ?? 0);
      }, 0);

    const dayCount = dayRecordsForAvg.length + caseRecords
      .filter((c) => c.workHours === '주간')
      .reduce((s, c) => s + (c.daysWorked || []).filter((d) => {
        const [y, m] = d.split('-').map(Number);
        return y === year && m === month;
      }).length, 0);
    const nightCount = nightRecordsForAvg.length + caseRecords
      .filter((c) => c.workHours === '야간')
      .reduce((s, c) => s + (c.daysWorked || []).filter((d) => {
        const [y, m] = d.split('-').map(Number);
        return y === year && m === month;
      }).length, 0);
    const dayTotalSum = dayRecordsForAvg.reduce((s, r) => s + (r.payWon ?? 0), 0) + caseDayIncome;
    const nightTotalSum = nightRecordsForAvg.reduce((s, r) => s + (r.payWon ?? 0), 0) + caseNightIncome;
    const avgDayWage = dayCount > 0 ? Math.round(dayTotalSum / dayCount) : null;
    const avgNightWage = nightCount > 0 ? Math.round(nightTotalSum / nightCount) : null;

    return { workDays: totalWorkDays, totalIncome, avgWage, avgDayWage, avgNightWage };
  }, [records, year, month]);

  const lastRecord = useMemo(() => {
    if (dayRecords.length === 0) return null;
    const sorted = [...dayRecords].sort((a, b) => (b.date > a.date ? 1 : -1));
    return sorted[0];
  }, [dayRecords]);

  const hasTodayRecord = useMemo(() => {
    if (dayRecords.some((r) => r.date === today)) return true;
    if (activeCase?.daysWorked?.includes(today)) return true;
    return false;
  }, [dayRecords, activeCase, today]);

  const daysSinceLastRecord = useMemo(() => {
    if (!lastRecord) return null;
    const last = new Date(lastRecord.date);
    const now = new Date(today);
    const diff = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    return diff;
  }, [lastRecord, today]);

  const showLowWarning = payWon > 0 && payWon < 50000;
  const showHighWarning = payWon > 500000;

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

  const AmountInput = () => (
    <div>
      <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">
        일당 (원)
      </label>
      <div className="p-4 rounded-2xl border-2 border-slate-200 bg-white">
        <p className="text-mobile-2xl font-bold text-slate-800">{formatWon(payWon)}</p>
        <p className="text-sm text-slate-500 mt-0.5">{formatManwon(payWon)}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {AMOUNT_STEPS.map(({ label, delta }) => (
            <button
              key={label}
              type="button"
              onClick={() => adjustPayWon(delta)}
              className={`min-w-[4rem] py-3 px-4 text-mobile-lg font-medium rounded-xl
                ${delta < 0 ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-700'}
                active:scale-[0.97] transition-transform`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="text"
          inputMode="numeric"
          placeholder="직접 입력 (예: 110000)"
          value={payWon === 0 ? '' : payWon.toLocaleString()}
          onChange={handleDirectInput}
          className="w-full mt-3 py-3 px-4 text-mobile-lg rounded-xl border-2 border-slate-200"
        />
      </div>
      {showLowWarning && (
        <p className="mt-2 text-sm text-amber-600">금액 단위가 맞나요? (예: 110,000원)</p>
      )}
      {showHighWarning && (
        <p className="mt-2 text-sm text-red-600">금액이 높아요. 단위가 맞나요?</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen px-5 pb-24 pt-6">
      <Toast message={toastMessage} visible={toastVisible} />

      <button onClick={onBack} className="text-mobile-lg text-teal-600 font-medium mb-6">
        ← 홈으로
      </button>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-mobile-2xl font-bold text-teal-700">
          근무 기록
        </h1>
        <button
          type="button"
          onClick={onGoToCertificate}
          className="py-2 px-4 text-mobile-lg font-medium rounded-xl
            bg-teal-100 text-teal-700 border-2 border-teal-200
            active:scale-[0.98] transition-transform"
        >
          증명서
        </button>
      </div>

      {/* 입력 모드 토글 */}
      <div className="flex rounded-xl overflow-hidden border-2 border-teal-200 mb-6">
        <button
          type="button"
          onClick={() => setInputMode('day')}
          className={`flex-1 py-3 text-mobile-lg font-medium transition-colors
            ${inputMode === 'day' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          하루 기록
        </button>
        <button
          type="button"
          onClick={() => setInputMode('case')}
          className={`flex-1 py-3 text-mobile-lg font-medium transition-colors
            ${inputMode === 'case' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          연속근무(케이스)
        </button>
      </div>

      {/* 입력 리마인드 (day 모드) */}
      {inputMode === 'day' && records.length > 0 && (
        <div className="mb-4 space-y-1">
          {!hasTodayRecord && (
            <p className="text-mobile-lg text-amber-700">오늘 기록이 아직 없어요</p>
          )}
          {daysSinceLastRecord !== null && daysSinceLastRecord >= 1 && (
            <p className="text-mobile-lg text-slate-600">
              마지막 기록이 {daysSinceLastRecord}일 전이에요
            </p>
          )}
        </div>
      )}

      {inputMode === 'day' && (
        <>
          <div className="flex gap-3 mb-6">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="flex-1 py-3 px-4 text-mobile-lg font-medium rounded-xl
                    bg-teal-100 text-teal-700 border-2 border-teal-200
                    active:scale-[0.98] transition-transform"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">날짜</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full py-4 px-4 text-mobile-xl rounded-xl border-2 border-slate-200"
                />
              </div>
              <div>
                <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">근무형태</label>
                <div className="flex gap-3">
                  <SelectButton value="병원" selected={workType === '병원'} onClick={setWorkType}>
                    병원
                  </SelectButton>
                  <SelectButton value="재가" selected={workType === '재가'} onClick={setWorkType}>
                    재가
                  </SelectButton>
                </div>
              </div>
              <div>
                <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">근무시간</label>
                <div className="flex flex-wrap gap-3">
                  <SelectButton value="주간" selected={workHours === '주간'} onClick={setWorkHours}>
                    주간
                  </SelectButton>
                  <SelectButton value="야간" selected={workHours === '야간'} onClick={setWorkHours}>
                    야간
                  </SelectButton>
                  <SelectButton value="24시간" selected={workHours === '24시간'} onClick={setWorkHours}>
                    24시간
                  </SelectButton>
                </div>
              </div>
              <div>
                <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">환자상태</label>
                <div className="flex flex-wrap gap-3">
                  <SelectButton value="기본" selected={patientStatus === '기본'} onClick={setPatientStatus}>
                    기본
                  </SelectButton>
                  <SelectButton value="치매" selected={patientStatus === '치매'} onClick={setPatientStatus}>
                    치매
                  </SelectButton>
                  <SelectButton value="수술후" selected={patientStatus === '수술후'} onClick={setPatientStatus}>
                    수술후
                  </SelectButton>
                  <SelectButton value="거동불가" selected={patientStatus === '거동불가'} onClick={setPatientStatus}>
                    거동불가
                  </SelectButton>
                </div>
              </div>
              <AmountInput />
              <button
                onClick={handleSave}
                disabled={!workType || !workHours || !patientStatus || payWon <= 0}
                className="w-full py-5 text-mobile-xl font-bold rounded-2xl
                  bg-teal-500 text-white disabled:bg-slate-300 disabled:cursor-not-allowed
                  active:scale-[0.98] transition-transform"
              >
                기록 저장
              </button>
              {lastRecord && (
                <button
                  type="button"
                  onClick={handleQuickSave}
                  className="w-full py-4 text-mobile-lg font-medium rounded-2xl
                    bg-teal-100 text-teal-700 border-2 border-teal-200
                    active:scale-[0.98] transition-transform"
                >
                  마지막 기록과 동일하게 저장
                </button>
              )}
              {lastSaved && (
                <button
                  type="button"
                  onClick={handleAddSameDay}
                  className="w-full py-4 text-mobile-lg font-medium rounded-2xl
                    bg-slate-200 text-slate-700 border-2 border-slate-300
                    active:scale-[0.98] transition-transform"
                >
                  같은 조건으로 하루 추가
                </button>
              )}
            </div>
        </>
      )}

      {inputMode === 'case' && (
        <>
          {activeCase ? (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border-2 border-teal-200 bg-teal-50">
                <h2 className="text-mobile-xl font-bold text-teal-700 mb-4">진행중 케이스</h2>
                <p className="text-mobile-lg text-slate-700">
                  시작일: {activeCase.startDate}
                </p>
                <p className="text-mobile-lg text-slate-700 mt-2">
                  근무일수: {(activeCase.daysWorked || []).length}일
                </p>
                <p className="text-mobile-lg text-slate-700 mt-1">
                  누적 수입: {formatWon((activeCase.daysWorked || []).length * (activeCase.payWon ?? 0))}
                  <span className="text-slate-500 text-sm ml-1">
                    {formatManwon((activeCase.daysWorked || []).length * (activeCase.payWon ?? 0))}
                  </span>
                </p>
                <div className="flex flex-col gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleAddTodayToCase}
                    className="w-full py-4 text-mobile-lg font-bold rounded-2xl
                      bg-teal-500 text-white active:scale-[0.98] transition-transform"
                  >
                    오늘 하루 추가(완료)
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseCase}
                    className="w-full py-4 text-mobile-lg font-medium rounded-2xl
                      bg-slate-200 text-slate-700 border-2 border-slate-300
                      active:scale-[0.98] transition-transform"
                  >
                    근무 종료(마감)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-mobile-lg text-slate-600 mb-4">
                케이스 시작 정보를 입력하세요.
              </p>
              <div>
                <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">시작일</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full py-4 px-4 text-mobile-xl rounded-xl border-2 border-slate-200"
                />
              </div>
              <div>
                <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">근무형태</label>
                <div className="flex gap-3">
                  <SelectButton value="병원" selected={workType === '병원'} onClick={setWorkType}>
                    병원
                  </SelectButton>
                  <SelectButton value="재가" selected={workType === '재가'} onClick={setWorkType}>
                    재가
                  </SelectButton>
                </div>
              </div>
              <div>
                <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">근무시간 (기본 24시간)</label>
                <div className="flex flex-wrap gap-3">
                  <SelectButton value="주간" selected={workHours === '주간'} onClick={setWorkHours}>
                    주간
                  </SelectButton>
                  <SelectButton value="야간" selected={workHours === '야간'} onClick={setWorkHours}>
                    야간
                  </SelectButton>
                  <SelectButton value="24시간" selected={workHours === '24시간' || !workHours} onClick={setWorkHours}>
                    24시간
                  </SelectButton>
                </div>
              </div>
              <div>
                <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">환자상태</label>
                <div className="flex flex-wrap gap-3">
                  <SelectButton value="기본" selected={patientStatus === '기본'} onClick={setPatientStatus}>
                    기본
                  </SelectButton>
                  <SelectButton value="치매" selected={patientStatus === '치매'} onClick={setPatientStatus}>
                    치매
                  </SelectButton>
                  <SelectButton value="수술후" selected={patientStatus === '수술후'} onClick={setPatientStatus}>
                    수술후
                  </SelectButton>
                  <SelectButton value="거동불가" selected={patientStatus === '거동불가'} onClick={setPatientStatus}>
                    거동불가
                  </SelectButton>
                </div>
              </div>
              <AmountInput />
              <button
                onClick={handleCaseStart}
                disabled={!workType || !patientStatus || payWon <= 0}
                className="w-full py-5 text-mobile-xl font-bold rounded-2xl
                  bg-teal-500 text-white disabled:bg-slate-300 disabled:cursor-not-allowed
                  active:scale-[0.98] transition-transform"
              >
                근무 시작
              </button>
            </div>
          )}

          {completedCases.length > 0 && (
            <div className="mt-10">
              <h2 className="text-mobile-xl font-bold text-teal-700 mb-4">종료된 케이스</h2>
              <div className="space-y-4">
                {completedCases.map((c) => {
                  const n = (c.daysWorked || []).length;
                  const total = n * (c.payWon ?? 0);
                  const avg = n > 0 ? Math.round(total / n) : 0;
                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white"
                    >
                      <p className="text-mobile-lg font-semibold text-slate-700">
                        {c.startDate} ~ {c.endDate} ({n}일)
                      </p>
                      <p className="text-mobile-lg text-slate-600 mt-1">
                        총수입: {formatWon(total)}{' '}
                        <span className="text-slate-500 text-sm">{formatManwon(total)}</span>
                      </p>
                      <p className="text-mobile-lg text-slate-600">
                        평균일당: {formatWon(avg)}{' '}
                        <span className="text-slate-500 text-sm">{formatManwon(avg)}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* 월별 통계 */}
      {records.length > 0 && (
        <div className="mt-10 p-6 bg-teal-50 rounded-2xl border border-teal-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-mobile-xl font-bold text-teal-700">월별 통계</h2>
            <div className="flex rounded-xl overflow-hidden border border-teal-200">
              <button
                type="button"
                onClick={() => setSelectedMonth('this')}
                className={`py-2 px-4 text-mobile-lg font-medium transition-colors
                  ${selectedMonth === 'this' ? 'bg-teal-500 text-white' : 'bg-white text-slate-600'}`}
              >
                이번달
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth('last')}
                className={`py-2 px-4 text-mobile-lg font-medium transition-colors
                  ${selectedMonth === 'last' ? 'bg-teal-500 text-white' : 'bg-white text-slate-600'}`}
              >
                지난달
              </button>
            </div>
          </div>
          <div className="space-y-3 text-mobile-lg">
            <p>
              <span className="text-slate-600">근무일수:</span>{' '}
              <span className="font-bold">{monthStats.workDays}일</span>
            </p>
            <p>
              <span className="text-slate-600">총수입:</span>{' '}
              <span className="font-bold">{formatWon(monthStats.totalIncome)}</span>
              <span className="text-slate-500 text-sm ml-1">{formatManwon(monthStats.totalIncome)}</span>
            </p>
            <p>
              <span className="text-slate-600">평균 일당:</span>{' '}
              <span className="font-bold">{formatWon(monthStats.avgWage)}</span>
              <span className="text-slate-500 text-sm ml-1">{formatManwon(monthStats.avgWage)}</span>
            </p>
            <p>
              <span className="text-slate-600">주간 평균 일당:</span>{' '}
              <span className="font-bold">
                {monthStats.avgDayWage !== null ? formatWon(monthStats.avgDayWage) : '-'}
              </span>
              {monthStats.avgDayWage !== null && (
                <span className="text-slate-500 text-sm ml-1">{formatManwon(monthStats.avgDayWage)}</span>
              )}
            </p>
            <p>
              <span className="text-slate-600">야간 평균 일당:</span>{' '}
              <span className="font-bold">
                {monthStats.avgNightWage !== null ? formatWon(monthStats.avgNightWage) : '-'}
              </span>
              {monthStats.avgNightWage !== null && (
                <span className="text-slate-500 text-sm ml-1">{formatManwon(monthStats.avgNightWage)}</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CareWorkerScreen;
