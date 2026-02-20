const STORAGE_KEY = 'carenote-careworker-logs';

function migrateRecordToPayWon(record) {
  try {
    if (typeof record.payWon === 'number' && !isNaN(record.payWon)) {
      return { ...record, payWon: Math.max(0, Math.floor(record.payWon)) };
    }
    if (typeof record.payManwon === 'number' && !isNaN(record.payManwon)) {
      return { ...record, payWon: Math.max(0, Math.floor(record.payManwon * 10000)) };
    }
    if (typeof record.payManwon === 'string') {
      const n = parseFloat(String(record.payManwon).replace(/,/g, ''));
      return { ...record, payWon: !isNaN(n) ? Math.max(0, Math.floor(n * 10000)) : 0 };
    }
    if (typeof record.pay === 'string') {
      const n = parseInt(String(record.pay).replace(/\D/g, ''), 10);
      return { ...record, payWon: !isNaN(n) ? Math.max(0, n) : 0 };
    }
    if (typeof record.pay === 'number' && !isNaN(record.pay)) {
      return { ...record, payWon: Math.max(0, Math.floor(record.pay)) };
    }
    if (typeof record.dailyWage === 'number' && !isNaN(record.dailyWage)) {
      return { ...record, payWon: Math.max(0, Math.floor(record.dailyWage)) };
    }
    if (typeof record.dailyWage === 'string') {
      const n = parseInt(String(record.dailyWage).replace(/\D/g, ''), 10);
      return { ...record, payWon: !isNaN(n) ? Math.max(0, n) : 0 };
    }
    return { ...record, payWon: 0 };
  } catch (_) {
    return { ...record, payWon: 0 };
  }
}

function migrateRecord(record) {
  const withPayWon = migrateRecordToPayWon(record);
  if (withPayWon.type === 'case') {
    return {
      ...withPayWon,
      daysWorked: Array.isArray(withPayWon.daysWorked) ? withPayWon.daysWorked : [],
      workPlaceType: withPayWon.workPlaceType || withPayWon.workType || '병원',
    };
  }
  if (!withPayWon.type) {
    return { ...withPayWon, type: 'day' };
  }
  return withPayWon;
}

export function saveRecords(records) {
  try {
    const migrated = records.map((r) => {
      const { payManwon, pay, dailyWage, ...rest } = r;
      const base = { ...rest, payWon: typeof r.payWon === 'number' ? r.payWon : migrateRecordToPayWon(r).payWon };
      return migrateRecord(base);
    });
    const json = JSON.stringify(migrated);
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch (e) {
    console.warn('CareNote: localStorage 저장 실패', e);
    return false;
  }
}

export function loadRecords() {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    const parsed = JSON.parse(json);
    const arr = Array.isArray(parsed) ? parsed : [];
    return arr.map(migrateRecord);
  } catch (e) {
    console.warn('CareNote: localStorage 복원 실패', e);
    return [];
  }
}
