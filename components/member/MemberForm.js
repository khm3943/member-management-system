// components/member/MemberForm.js
// 회원 등록/수정 폼 컴포넌트
function MemberForm({ member = null, isOpen, onClose, onSave }) {
    const [form, setForm] = React.useState({
        name: '', 
        nickname: '', 
        birthYear: '', 
        tierName: 'Unranked', 
        tierNumber: '',
        mainPosition: '없음', 
        subPositions: [], 
        note: ''
    });

    // 수정 모드일 때 폼 데이터 설정
    React.useEffect(() => {
        if (member) {
            const tierMatch = member.tier?.match(/([a-zA-Z]+)(\d*)/);
            const tierName = tierMatch ? tierMatch[1] : 'Unranked';
            const tierNumber = tierMatch ? tierMatch[2] : '';
            
            setForm({
                ...member,
                tierName,
                tierNumber,
                subPositions: member.subPositions ? member.subPositions.split(',') : []
            });
        } else {
            resetForm();
        }
    }, [member]);

    const resetForm = () => {
        setForm({
            name: '', 
            nickname: '', 
            birthYear: '', 
            tierName: 'Unranked', 
            tierNumber: '',
            mainPosition: '없음', 
            subPositions: [], 
            note: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.name || !form.nickname) {
            alert('이름과 닉네임은 필수입니다!');
            return;
        }
        
        const data = {
            ...form,
            tier: form.tierName + (form.tierNumber || ''),
            subPositions: form.subPositions.join(',')
        };
        
        await onSave(data, member?.id);
        handleClose();
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const toggleSubPosition = (pos) => {
        const subs = [...form.subPositions];
        const idx = subs.indexOf(pos);
        if (idx >= 0) {
            subs.splice(idx, 1);
        } else {
            subs.push(pos);
        }
        setForm({...form, subPositions: subs});
    };

    if (!isOpen) return null;

    return (
        <div className="modal">
            <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-bold mb-3">
                    {member ? '클랜원 수정' : '클랜원 추가'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        placeholder="이름*"
                        value={form.name}
                        onChange={(e) => setForm({...form, name: e.target.value})}
                        required
                    />
                    
                    <input
                        placeholder="닉네임#태그*"
                        value={form.nickname}
                        onChange={(e) => setForm({...form, nickname: e.target.value})}
                        required
                    />
                    
                    <input
                        placeholder="생년 (예: 1990)"
                        value={form.birthYear}
                        onChange={(e) => setForm({...form, birthYear: e.target.value})}
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={form.tierName}
                            onChange={(e) => setForm({...form, tierName: e.target.value})}
                        >
                            {TIERS.map(t => (
                                <option key={t.name} value={t.name}>{t.ko}</option>
                            ))}
                        </select>
                        <input
                            placeholder="숫자 (예: 4)"
                            value={form.tierNumber}
                            onChange={(e) => setForm({...form, tierNumber: e.target.value})}
                        />
                    </div>
                    
                    <select
                        value={form.mainPosition}
                        onChange={(e) => setForm({...form, mainPosition: e.target.value})}
                    >
                        <option value="없음">주라인 선택</option>
                        {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    
                    <div className="border rounded p-2">
                        <p className="text-sm mb-1">부라인 (복수 선택):</p>
                        {POSITIONS.map(p => (
                            <label key={p} className="inline-block mr-3">
                                <input
                                    type="checkbox"
                                    checked={form.subPositions.includes(p)}
                                    onChange={() => toggleSubPosition(p)}
                                    className="cb"
                                />
                                {p}
                            </label>
                        ))}
                    </div>
                    
                    <textarea
                        placeholder="비고"
                        value={form.note}
                        onChange={(e) => setForm({...form, note: e.target.value})}
                        rows="2"
                    />
                    
                    <div className="flex gap-2 mt-4">
                        <button type="submit" className="flex-1 btn btn-blue">
                            {member ? '수정' : '저장'}
                        </button>
                        <button type="button" onClick={handleClose} className="flex-1 btn btn-gray">
                            취소
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
