import { useState, useEffect, useMemo, useRef } from 'react';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { loadRecords } from '../utils/storage';
import { getDisplayId, getUserMeta, saveUserMeta } from '../utils/user';
import { requestOtp, verifyOtp } from '../api/otp';
import Toast from '../components/Toast';

const DEMO_MODE = true;
const KAKAO_WIDTH = 1080;
const KAKAO_HEIGHT = 1920;

function CertificateScreen({ onBack }) {
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [certTab, setCertTab] = useState('caregiver'); // 'caregiver' | 'center'
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState(null);
  const templateRef = useRef(null);

  useEffect(() => {
    try {
      setRecords(loadRecords());
      setMeta(getUserMeta());
    } catch (_) {
      setRecords([]);
      setMeta(getUserMeta());
    }
  }, []);

  useEffect(() => {
    if (!toastVisible) return;
    const t = setTimeout(() => setToastVisible(false), 3000);
    return () => clearTimeout(t);
  }, [toastVisible]);

  const displayId = useMemo(() => getDisplayId(), []);

  const certInfo = useMemo(() => {
    const dayRecords = records.filter((r) => (r.type || 'day') === 'day');
    const caseRecords = records.filter((r) => r.type === 'case');
    const completedCases = caseRecords.filter((c) => c.endDate);

    let minDate = null;
    let maxDate = null;

    dayRecords.forEach((r) => {
      if (r.date) {
        if (!minDate || r.date < minDate) minDate = r.date;
        if (!maxDate || r.date > maxDate) maxDate = r.date;
      }
    });
    caseRecords.forEach((c) => {
      if (c.startDate && (!minDate || c.startDate < minDate)) minDate = c.startDate;
      (c.daysWorked || []).forEach((d) => {
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      });
      if (c.endDate && (!maxDate || c.endDate > maxDate)) maxDate = c.endDate;
    });

    let periodDays = 0;
    if (minDate && maxDate) {
      const a = new Date(minDate);
      const b = new Date(maxDate);
      periodDays = Math.max(0, Math.ceil((b - a) / (1000 * 60 * 60 * 24))) + 1;
    }

    const totalWorkDays = dayRecords.length + caseRecords.reduce((s, c) => s + (c.daysWorked || []).length, 0);
    const caseCount = completedCases.length;
    const casePeriods = completedCases.map((c) => (c.daysWorked || []).length).filter((n) => n > 0);
    const avgPeriod = casePeriods.length > 0 ? Math.round(casePeriods.reduce((a, b) => a + b, 0) / casePeriods.length) : 0;
    const maxPeriod = casePeriods.length > 0 ? Math.max(...casePeriods) : 0;

    const total24h = dayRecords.filter((r) => r.workHours === '24시간').length +
      caseRecords.filter((c) => c.workHours === '24시간').reduce((s, c) => s + (c.daysWorked || []).length, 0);
    const ratio24h = totalWorkDays > 0 ? Math.round((total24h / totalWorkDays) * 100) : 0;

    const dementiaDays = dayRecords.filter((r) => r.patientStatus === '치매').length +
      caseRecords.filter((c) => c.patientStatus === '치매').reduce((s, c) => s + (c.daysWorked || []).length, 0);
    const immobileDays = dayRecords.filter((r) => r.patientStatus === '거동불가').length +
      caseRecords.filter((c) => c.patientStatus === '거동불가').reduce((s, c) => s + (c.daysWorked || []).length, 0);
    const postOpDays = dayRecords.filter((r) => r.patientStatus === '수술후').length +
      caseRecords.filter((c) => c.patientStatus === '수술후').reduce((s, c) => s + (c.daysWorked || []).length, 0);

    const hospitalDays = dayRecords.filter((r) => (r.workType || r.workPlaceType) === '병원').length +
      caseRecords.filter((c) => (c.workPlaceType || c.workType) === '병원').reduce((s, c) => s + (c.daysWorked || []).length, 0);
    const homeDays = dayRecords.filter((r) => (r.workType || r.workPlaceType) === '재가').length +
      caseRecords.filter((c) => (c.workPlaceType || c.workType) === '재가').reduce((s, c) => s + (c.daysWorked || []).length, 0);
    const ratioHospital = totalWorkDays > 0 ? Math.round((hospitalDays / totalWorkDays) * 100) : 0;
    const ratioHome = totalWorkDays > 0 ? Math.round((homeDays / totalWorkDays) * 100) : 0;

    return {
      firstRecordDate: minDate,
      lastRecordDate: maxDate,
      periodDays,
      dataCreatedAt: minDate,
      totalWorkDays,
      caseCount,
      avgPeriod,
      maxPeriod,
      ratio24h,
      dementiaDays,
      immobileDays,
      postOpDays,
      ratioHospital,
      ratioHome,
    };
  }, [records]);

  const handleRequestOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setToastMessage('전화번호를 올바르게 입력해주세요');
      setToastVisible(true);
      return;
    }
    try {
      const res = await requestOtp(phone, DEMO_MODE);
      if (res.success && res.demoCode) {
        setToastMessage(`(데모) 인증번호: ${res.demoCode}`);
        setToastVisible(true);
      }
    } catch (e) {
      setToastMessage(e.message || '인증번호 요청 실패');
      setToastVisible(true);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setToastMessage('인증번호 6자리를 입력해주세요');
      setToastVisible(true);
      return;
    }
    setVerifying(true);
    try {
      const res = await verifyOtp(phone, code, DEMO_MODE);
      if (res.success && res.masked) {
        saveUserMeta({
          phoneVerified: true,
          verifiedPhoneMasked: res.masked,
          verifiedAt: new Date().toISOString().slice(0, 10),
        });
        setMeta(getUserMeta());
        setCode('');
        setToastMessage('본인확인이 완료되었습니다');
        setToastVisible(true);
      } else {
        setToastMessage('인증번호가 올바르지 않습니다');
        setToastVisible(true);
      }
    } catch (e) {
      setToastMessage(e.message || '인증 실패');
      setToastVisible(true);
    } finally {
      setVerifying(false);
    }
  };

  const formatPhoneInput = (v) => {
    const d = v.replace(/\D/g, '');
    if (d.length <= 3) return d;
    if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhoneInput(e.target.value));
  };

  const handleSaveKakaoImage = async () => {
    if (!templateRef.current) return;
    setExporting(true);
    setExportType('image');
    try {
      const dataUrl = await toPng(templateRef.current, {
        width: KAKAO_WIDTH,
        height: KAKAO_HEIGHT,
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `CareNote_경력증명서_${displayId}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      setToastMessage('이미지가 저장되었습니다');
      setToastVisible(true);
    } catch (e) {
      console.warn(e);
      setToastMessage('이미지 저장에 실패했습니다');
      setToastVisible(true);
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  const handleSavePdf = async () => {
    if (!templateRef.current) return;
    setExporting(true);
    setExportType('pdf');
    try {
      const canvas = await html2canvas(templateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = 210;
      const pdfH = 297;
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = Math.min(pdfW / imgW, pdfH / imgH);
      const w = imgW * ratio;
      const h = imgH * ratio;
      const x = (pdfW - w) / 2;
      const y = (pdfH - h) / 2;
      pdf.addImage(imgData, 'PNG', x, y, w, h);
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      pdf.save(`carenote_certificate_${dateStr}.pdf`);
      setToastMessage('PDF가 저장되었습니다');
      setToastVisible(true);
    } catch (e) {
      console.warn(e);
      setToastMessage('PDF 저장에 실패했습니다');
      setToastVisible(true);
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  const identityText = meta?.phoneVerified
    ? `완료 (${meta.verifiedPhoneMasked || '010-****-****'}, ${meta.verifiedAt || '-'})`
    : '미완료';

  return (
    <div className="min-h-screen px-5 pb-24 pt-6">
      <Toast message={toastMessage} visible={toastVisible} />

      <button onClick={onBack} className="text-mobile-lg text-teal-600 font-medium mb-6">
        ← 홈으로
      </button>

      <h1 className="text-mobile-2xl font-bold text-teal-700 mb-6">
        경력증명서
      </h1>

      {/* 사용자 표시 ID */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-100">
        <p className="text-mobile-lg text-slate-600">사용자 ID</p>
        <p className="text-mobile-xl font-bold text-slate-800">{displayId}</p>
      </div>

      {/* 본인확인 섹션 */}
      <div className="mb-6 p-6 rounded-2xl border-2 border-teal-200 bg-white">
        <h2 className="text-mobile-xl font-bold text-teal-700 mb-4">
          본인확인하고 증명서 발급
        </h2>

        {meta?.phoneVerified ? (
          <div className="text-mobile-lg text-slate-700">
            <p className="font-semibold text-teal-600">
              본인확인: 완료({meta.verifiedPhoneMasked || '010-****-****'})
            </p>
            <p className="text-slate-500 mt-1">{meta.verifiedAt || '-'}</p>
          </div>
        ) : (
          <>
            <p className="text-mobile-lg text-amber-700 mb-4">본인확인: 미완료</p>
            <div className="space-y-4">
              <div>
                <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">전화번호</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={13}
                  className="w-full py-4 px-4 text-mobile-xl rounded-xl border-2 border-slate-200"
                />
              </div>
              <div>
                <label className="block text-mobile-lg font-semibold text-slate-700 mb-2">인증번호 (6자리)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="w-full py-4 px-4 text-mobile-xl rounded-xl border-2 border-slate-200"
                />
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  className="w-full py-4 text-mobile-lg font-medium rounded-2xl bg-slate-200 text-slate-700 border-2 border-slate-300 active:scale-[0.98] transition-transform"
                >
                  인증번호 받기
                </button>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifying}
                  className="w-full py-4 text-mobile-lg font-bold rounded-2xl bg-teal-500 text-white disabled:opacity-60 active:scale-[0.98] transition-transform"
                >
                  {verifying ? '확인 중...' : '본인확인 완료'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 탭: 보호자용 / 센터용 */}
      <div className="flex rounded-xl overflow-hidden border-2 border-teal-200 mb-6">
        <button
          type="button"
          onClick={() => setCertTab('caregiver')}
          className={`flex-1 py-3 text-mobile-lg font-medium transition-colors
            ${certTab === 'caregiver' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          보호자용
        </button>
        <button
          type="button"
          onClick={() => setCertTab('center')}
          className={`flex-1 py-3 text-mobile-lg font-medium transition-colors
            ${certTab === 'center' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          센터용
        </button>
      </div>

      {/* 템플릿 렌더 영역 */}
      <div className="overflow-x-auto mb-6">
        <div
          ref={templateRef}
          className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden"
          style={{
            width: 360,
            minHeight: 640,
            aspectRatio: `${KAKAO_WIDTH}/${KAKAO_HEIGHT}`,
          }}
        >
          <div className="p-6 text-slate-800" style={{ fontSize: '13px' }}>
            {certTab === 'caregiver' ? (
              <>
                <h3 className="font-bold text-base mb-4 text-center">돌봄노트 간병 경험 요약</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>사용자 ID</strong> {displayId}</p>
                  <p><strong>본인확인</strong> {identityText}</p>
                  <p><strong>기록 시작일</strong> {certInfo.firstRecordDate || '-'}</p>
                  <p><strong>마지막 기록일</strong> {certInfo.lastRecordDate || '-'}</p>
                  <p><strong>데이터 생성일</strong> {certInfo.dataCreatedAt || '-'}</p>
                  <p><strong>총 기록 기간</strong> {certInfo.periodDays ? `${certInfo.periodDays}일` : '-'}</p>
                </div>
                <div className="mt-4 space-y-1">
                  <p><strong>활동지역</strong> -</p>
                  <p><strong>총 근무일수</strong> {certInfo.totalWorkDays}일</p>
                  <p><strong>총 케이스 수</strong> {certInfo.caseCount}건</p>
                  <p><strong>평균 근무기간</strong> {certInfo.avgPeriod > 0 ? `약 ${certInfo.avgPeriod}일` : '-'}</p>
                  <p><strong>최장 근무기간</strong> {certInfo.maxPeriod > 0 ? `${certInfo.maxPeriod}일` : '-'}</p>
                </div>
                <div className="mt-4">
                  <p className="font-medium mb-2">주요 경험:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>치매 환자 간병 경험</li>
                    <li>거동이 어려운 환자 간병 경험</li>
                    <li>수술 후 회복 환자 간병 경험</li>
                  </ul>
                </div>
                <p className="mt-4 font-medium">24시간 간병 경험이 많습니다.</p>
                <p className="text-slate-500 text-xs mt-6">
                  본 자료는 돌봄노트를 통해 기록된 간병 활동을 기반으로 생성된 참고 자료입니다.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-bold text-base mb-4 text-center">돌봄노트 활동 요약 (센터 제출용)</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>사용자 ID</strong> {displayId}</p>
                  <p><strong>본인확인</strong> {identityText}</p>
                  <p><strong>기록 시작일</strong> {certInfo.firstRecordDate || '-'}</p>
                  <p><strong>마지막 기록일</strong> {certInfo.lastRecordDate || '-'}</p>
                  <p><strong>데이터 생성일</strong> {certInfo.dataCreatedAt || '-'}</p>
                  <p><strong>총 기록 기간</strong> {certInfo.periodDays ? `${certInfo.periodDays}일` : '-'}</p>
                </div>
                <table className="w-full text-sm border-collapse mt-4">
                  <tbody>
                    <tr><td className="border py-1 px-2 bg-slate-100 font-medium">총 근무일수</td><td className="border py-1 px-2 font-bold">{certInfo.totalWorkDays}일</td></tr>
                    <tr><td className="border py-1 px-2 bg-slate-100 font-medium">총 케이스 수</td><td className="border py-1 px-2 font-bold">{certInfo.caseCount}건</td></tr>
                    <tr><td className="border py-1 px-2 bg-slate-100 font-medium">평균 근무기간</td><td className="border py-1 px-2">{certInfo.avgPeriod}일</td></tr>
                    <tr><td className="border py-1 px-2 bg-slate-100 font-medium">최장 근무기간</td><td className="border py-1 px-2">{certInfo.maxPeriod}일</td></tr>
                    <tr><td className="border py-1 px-2 bg-slate-100 font-medium">24시간 근무 비율</td><td className="border py-1 px-2 font-bold">{certInfo.ratio24h}%</td></tr>
                  </tbody>
                </table>
                <div className="mt-4">
                  <p className="font-medium mb-2">간병 경험:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>치매 환자 {certInfo.dementiaDays}일</li>
                    <li>거동불가 환자 {certInfo.immobileDays}일</li>
                    <li>수술 후 환자 {certInfo.postOpDays}일</li>
                  </ul>
                </div>
                <div className="mt-4">
                  <p className="font-medium mb-2">근무 비율:</p>
                  <p className="text-sm">병원 {certInfo.ratioHospital}% · 재가 {certInfo.ratioHome}%</p>
                </div>
                <p className="text-slate-500 text-xs mt-6">
                  본 자료는 사용자가 일별 기록을 기반으로 생성한 활동 요약입니다.
                </p>
              </>
            )}
            <p className="text-slate-400 text-xs mt-4 text-center">돌봄노트 · 참고자료</p>
          </div>
        </div>
      </div>

      {/* 내보내기 버튼 */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleSaveKakaoImage}
          disabled={exporting}
          className="w-full py-5 text-mobile-xl font-bold rounded-2xl
            bg-teal-500 text-white disabled:opacity-60
            active:scale-[0.98] transition-transform"
        >
          {exportType === 'image' && exporting ? '저장 중...' : '카카오용 이미지 저장'}
        </button>
        <button
          type="button"
          onClick={handleSavePdf}
          disabled={exporting}
          className="w-full py-5 text-mobile-xl font-bold rounded-2xl
            bg-teal-600 text-white disabled:opacity-60
            active:scale-[0.98] transition-transform"
        >
          {exportType === 'pdf' && exporting ? '저장 중...' : 'PDF 저장'}
        </button>
      </div>
    </div>
  );
}

export default CertificateScreen;
