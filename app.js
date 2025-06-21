const { useState, useEffect } = React;

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function App() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [form, setForm] = useState({
        name: '', nickname: '', birthYear: '', 
        tierName: 'Unranked', tierNumber: '',
        mainPosition: '없음', subPositions: [], note: ''
    });

    useEffect(() => {
        return db.collection('lol_members').orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
    }, []);

    // 정렬 함수
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // 정렬된 데이터
    const sortedMembers = React.useMemo(() => {
        let sortableMembers = [...members];
        if (sortConfig.key) {
            sortableMembers.sort((a, b) => {
                let aValue = a[sortConfig.key] || '';
                let bValue = b[sortConfig.key] || '';
                
                // 티어 정렬을 위한 특별 처리
                if (sortConfig.key === 'tier') {
                    const tierOrder = ['Unranked', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'GrandMaster', 'Challenger'];
                    const getTierValue = (tier) => {
                        const match = tier?.match(/([a-zA-Z]+)(\d*)/);
                        const tierName = match ? match[1] : 'Unranked';
                        const tierNumber = match ? parseInt(match[2]) || 0 : 0;
                        const tierIndex = tierOrder.findIndex(t => t.toLowerCase() === tierName.toLowerCase());
                        return tierIndex * 10 + (10 - tierNumber); // 높은 숫자가 더 낮은 티어
                    };
                    aValue = getTierValue(aValue);
                    bValue = getTierValue(bValue);
                }
                
                // 숫자 비교
                if (!isNaN(aValue) && !isNaN(bValue)) {
                    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
                
                // 문자열 비교
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableMembers;
    }, [members, sortConfig]);

    // 필터링 - 이름, 닉네임, 생년, 티어, 주라인 검색
    const filtered = sortedMembers.filter(m => {
        const searchLower = search.toLowerCase();
        return (
            m.name.includes(search) ||
            m.nickname.toLowerCase().includes(searchLower) ||
            (m.birthYear && m.birthYear.toString().includes(search)) ||
            (m.tier && m.tier.toLowerCase().includes(searchLower)) ||
            (m.mainPosition && m.mainPosition.includes(search))
        );
    });

    // 정렬 아이콘 컴포넌트
    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) {
            return <span className="text-gray-400 ml-1">↕</span>;
        }
        return sortConfig.direction === 'asc' ? 
            <span className="text-blue-600 ml-1">↑</span> : 
            <span className="text-blue-600 ml-1">↓</span>;
    };

    const handleSubmit = async () => {
        if (!form.name || !form.nickname) {
            alert('이름과 닉네임은 필수입니다!');
            return;
        }
        
        const data = {
            ...form,
            tier: form.tierName + (form.tierNumber || ''),
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
        setForm({ 
            name: '', nickname: '', birthYear: '', 
            tierName: 'Unranked', tierNumber: '',
            mainPosition: '없음', subPositions: [], note: '' 
        });
        setShowForm(false);
        setEditId(null);
    };

    const handleEdit = (member) => {
        const tierMatch = member.tier?.match(/([a-zA-Z]+)(\d*)/);
        const tierName = tierMatch ? tierMatch[1] : 'Unranked';
        const tierNumber = tierMatch ? tierMatch[2] : '';
        
        setForm({
            ...member,
            tierName,
            tierNumber,
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
                const existingNames = new Set(members.map(m => m.name));
                const batch = db.batch();
                let count = 0;
                
                results.data.forEach((row, i) => {
                    if (i < 13 || !row[1] || !row[2]) return;
                    if (existingNames.has(row[1])) return;
                    
                    const positions = [row[13], row[14], row[15], row[16], row[17]];
                    const mainIdx = positions.findIndex(p => p === '●');
                    const subIndices = positions.map((p, idx) => p === '○' ? idx : -1).filter(idx => idx >= 0);
                    
                    const tierName = row[11] || 'Unranked';
                    const tierNumber = row[12] || '';
                    
                    batch.set(db.collection('lol_members').doc(), {
                        name: row[1],
                        nickname: row[2],
                        birthYear: row[3] || '',
                        tier: tierName + tierNumber,
                        tierName,
                        tierNumber,
                        mainPosition: mainIdx >= 0 ? POSITIONS[mainIdx] : '없음',
                        subPositions: subIndices.map(idx => POSITIONS[idx]).join(','),
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
        const data = filtered.map(m => [
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

    if (loading) return <div className="flex justify-center items-center h-screen">로딩중...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow p-4 mb-4">
                    <h1 className="text-2xl font-bold mb-3">LOL 회원 관리 ({members.length}명)</h1>
                    <div className="flex gap-2 flex-wrap">
                        <input
                            type="text"
                            placeholder="검색..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 min-w-[200px]"
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
                        <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[90vh] overflow-y-auto">
                            <h2 className="text-lg font-bold mb-3">{editId ? '회원 수정' : '회원 추가'}</h2>
                            <div className="space-y-2">
                                <input
                                    placeholder="이름*"
                                    value={form.name}
                                    onChange={(e) => setForm({...form, name: e.target.value})}
                                />
                                <input
                                    placeholder="닉네임#태그*"
                                    value={form.nickname}
                                    onChange={(e) => setForm({...form, nickname: e.target.value})}
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
                                    <th className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                                        이름 <SortIcon column="name" />
                                    </th>
                                    <th className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('nickname')}>
                                        닉네임 <SortIcon column="nickname" />
                                    </th>
                                    <th className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('birthYear')}>
                                        생년 <SortIcon column="birthYear" />
                                    </th>
                                    <th className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('tier')}>
                                        티어 <SortIcon column="tier" />
                                    </th>
                                    <th className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('mainPosition')}>
                                        주라인 <SortIcon column="mainPosition" />
                                    </th>
                                    <th className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('subPositions')}>
                                        부라인 <SortIcon column="subPositions" />
                                    </th>
                                    <th>비고</th>
                                    <th>OP.GG</th>
                                    <th>작업</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(m => (
                                    <tr key={m.id} className="border-t">
                                        <td>{m.name}</td>
                                        <td className="font-mono text-xs">{m.nickname}</td>
                                        <td>{m.birthYear}</td>
                                        <td>
                                            <span className={`tier ${getTierClass(m.tierName || m.tier)}`}>
                                                {m.tier || '-'}
                                            </span>
                                        </td>
                                        <td>{m.mainPosition}</td>
                                        <td>{m.subPositions || '-'}</td>
                                        <td className="text-xs">{m.note || '-'}</td>
                                        <td>
                                            <a href={getOpggLink(m.nickname)} target="_blank" className="link">
                                                전적
                                            </a>
                                        </td>
                                        <td>
                                            <button onClick={() => handleEdit(m)} className="text-green-600 mr-2">
                                                수정
                                            </button>
                                            <button onClick={() => handleDelete(m.id)} className="text-red-600">
                                                삭제
                                            </button>
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
