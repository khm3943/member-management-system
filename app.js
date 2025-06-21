const { useState, useEffect } = React;

firebase.initializeApp({
    apiKey: "AIzaSyBQKKW65qAGNpa1G51hf2ntRw10hZNg8s0",
    authDomain: "member-system-d4684.firebaseapp.com",
    projectId: "member-system-d4684",
    storageBucket: "member-system-d4684.firebasestorage.app",
    messagingSenderId: "904998203480",
    appId: "1:904998203480:web:6686cdc25fff8bdae75a2d"
});
const db = firebase.firestore();
const positions = ['탑', '정글', '미드', '원딜', '서폿'];

function App() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({
        name: '', nickname: '', birthYear: '', tier: '',
        mainPosition: '없음', subPositions: [], note: ''
    });

    useEffect(() => {
        return db.collection('lol_members').orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
    }, []);

    const handleSubmit = async () => {
        if (!form.name || !form.nickname) {
            alert('이름과 닉네임은 필수입니다!');
            return;
        }
        
        const data = {
            ...form,
            subPositions: form.subPositions.join(',')
        };
        
        if (editId) {
            await db.collection('lol_members').doc(editId).update(data);
        } else {
            await db.collection('lol_members').add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        resetForm();
    };

    const resetForm = () => {
        setForm({ name: '', nickname: '', birthYear: '', tier: '', 
                 mainPosition: '없음', subPositions: [], note: '' });
        setShowForm(false);
        setEditId(null);
    };

    const handleEdit = (member) => {
        setForm({
            ...member,
            subPositions: member.subPositions ? member.subPositions.split(',') : []
        });
        setEditId(member.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (confirm('삭제하시겠습니까?')) {
            await db.collection('lol_members').doc(id).delete();
        }
    };

    const handleCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            complete: async (results) => {
                // 기존 회원 이름 목록
                const existingNames = new Set(members.map(m => m.name));
                const batch = db.batch();
                let count = 0;
                
                results.data.forEach((row, i) => {
                    if (i < 13 || !row[1] || !row[2]) return;
                    
                    // 중복 체크
                    if (existingNames.has(row[1])) return;
                    
                    const positions = [row[13], row[14], row[15], row[16], row[17]];
                    const mainIdx = positions.findIndex(p => p === '●');
                    const subIndices = positions.map((p, idx) => p === '○' ? idx : -1).filter(idx => idx >= 0);
                    const posNames = ['탑', '정글', '미드', '원딜', '서폿'];
                    
                    batch.set(db.collection('lol_members').doc(), {
                        name: row[1],
                        nickname: row[2],
                        birthYear: row[3] || '',
                        tier: row[10] || '',
                        mainPosition: mainIdx >= 0 ? posNames[mainIdx] : '없음',
                        subPositions: subIndices.map(idx => posNames[idx]).join(','),
                        note: row[7] || '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    count++;
                });
                
                await batch.commit();
                alert(`${count}명 추가 완료! (중복 제외)`);
                e.target.value = '';
            },
            encoding: 'UTF-8'
        });
    };

    const exportCSV = () => {
        const headers = ['이름', '닉네임', '생년', '티어', '주라인', '부라인', '비고'];
        const data = members.map(m => [
            m.name,
            m.nickname,
            m.birthYear || '',
            m.tier || '',
            m.mainPosition || '없음',
            m.subPositions || '',
            m.note || ''
        ]);
        
        let csv = '\uFEFF' + headers.join(',') + '\n';
        data.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `LOL회원_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const getOpggLink = (nickname) => {
        const converted = nickname.replace('#', '-');
        return `https://op.gg/ko/lol/summoners/kr/${encodeURIComponent(converted)}`;
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

    const filtered = members.filter(m => 
        m.name.includes(search) || m.nickname.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="flex justify-center items-center h-screen">로딩중...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow p-4 mb-4">
                    <h1 className="text-2xl font-bold mb-3">LOL 회원 관리 ({members.length}명)</h1>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="검색..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 px-3 py-2 border rounded"
                        />
                        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn btn-blue">추가</button>
                        <label className="btn btn-green">
                            CSV 가져오기
                            <input type="file" accept=".csv" onChange={handleCSV} className="hidden" />
                        </label>
                        <button onClick={exportCSV} className="btn btn-green">CSV 내보내기</button>
                    </div>
                </div>

                {showForm && (
                    <div className="modal">
                        <div className="bg-white rounded-lg p-4 w-full max-w-md">
                            <h2 className="text-lg font-bold mb-3">{editId ? '회원 수정' : '회원 추가'}</h2>
                            <div className="space-y-2">
                                <input
                                    placeholder="이름*"
                                    value={form.name}
                                    onChange={(e) => setForm({...form, name: e.target.value})}
                                    className="w-full px-3 py-2 border rounded"
                                />
                                <input
                                    placeholder="닉네임#태그*"
                                    value={form.nickname}
                                    onChange={(e) => setForm({...form, nickname: e.target.value})}
                                    className="w-full px-3 py-2 border rounded"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        placeholder="생년 (예: 1990)"
                                        value={form.birthYear}
                                        onChange={(e) => setForm({...form, birthYear: e.target.value})}
                                        className="px-3 py-2 border rounded"
                                    />
                                    <input
                                        placeholder="티어 (예: Diamond 4)"
                                        value={form.tier}
                                        onChange={(e) => setForm({...form, tier: e.target.value})}
                                        className="px-3 py-2 border rounded"
                                    />
                                </div>
                                <select
                                    value={form.mainPosition}
                                    onChange={(e) => setForm({...form, mainPosition: e.target.value})}
                                    className="w-full px-3 py-2 border rounded"
                                >
                                    <option value="없음">주라인 선택</option>
                                    {positions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <div className="border rounded p-2">
                                    <p className="text-sm mb-1">부라인 (복수 선택):</p>
                                    {positions.map(p => (
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
                                    className="w-full px-3 py-2 border rounded"
                                    rows="2"
                                />
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button onClick={handleSubmit} className="flex-1 btn btn-blue">
                                    {editId ? '수정' : '저장'}
                                </button>
                                <button onClick={resetForm} className="flex-1 btn btn-gray">취소</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left">이름</th>
                                    <th className="px-3 py-2 text-left">닉네임</th>
                                    <th className="px-3 py-2 text-left">생년</th>
                                    <th className="px-3 py-2 text-left">티어</th>
                                    <th className="px-3 py-2 text-left">주라인</th>
                                    <th className="px-3 py-2 text-left">부라인</th>
                                    <th className="px-3 py-2 text-left">비고</th>
                                    <th className="px-3 py-2 text-left">OP.GG</th>
                                    <th className="px-3 py-2 text-left">작업</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(m => (
                                    <tr key={m.id} className="border-t hover:bg-gray-50">
                                        <td className="px-3 py-2">{m.name}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{m.nickname}</td>
                                        <td className="px-3 py-2">{m.birthYear}</td>
                                        <td className="px-3 py-2"><span className="tier">{m.tier || '-'}</span></td>
                                        <td className="px-3 py-2">{m.mainPosition}</td>
                                        <td className="px-3 py-2">{m.subPositions || '-'}</td>
                                        <td className="px-3 py-2 text-xs">{m.note || '-'}</td>
                                        <td className="px-3 py-2">
                                            <a href={getOpggLink(m.nickname)} target="_blank" className="link">전적</a>
                                        </td>
                                        <td className="px-3 py-2">
                                            <button onClick={() => handleEdit(m)} className="text-green-600 mr-2">수정</button>
                                            <button onClick={() => handleDelete(m.id)} className="text-red-600">삭제</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="text-center py-8 text-gray-500">데이터가 없습니다</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
