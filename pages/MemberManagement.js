// pages/MemberManagement.js (간소화된 버전 - 400줄 → 80줄)
function MemberManagement() {
    // 커스텀 훅 사용으로 로직 대폭 간소화
    const {
        members,
        loading,
        error,
        saveMember,
        deleteMember,
        updateMemberTier,
        updateMemberPosition,
        updateMemberSubPositions,
        importFromCSV
    } = useMembers();

    // UI 상태
    const [search, setSearch] = React.useState('');
    const [sortConfig, setSortConfig] = React.useState({ key: null, direction: 'asc' });
    const [showForm, setShowForm] = React.useState(false);
    const [editMember, setEditMember] = React.useState(null);

    // 검색 및 정렬된 멤버 목록
    const filteredAndSortedMembers = React.useMemo(() => {
        let filtered = members.filter(m => {
            const searchLower = search.toLowerCase();
            return (
                m.name.includes(search) ||
                m.nickname.toLowerCase().includes(searchLower) ||
                (m.birthYear && m.birthYear.toString().includes(search)) ||
                (m.tier && m.tier.toLowerCase().includes(searchLower)) ||
                (m.mainPosition && m.mainPosition.includes(search))
            );
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue = a[sortConfig.key] || '';
                let bValue = b[sortConfig.key] || '';
                
                if (sortConfig.key === 'tier') {
                    aValue = getTierScore(aValue);
                    bValue = getTierScore(bValue);
                }
                
                if (!isNaN(aValue) && !isNaN(bValue)) {
                    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
                
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return filtered;
    }, [members, search, sortConfig]);

    // 핸들러들
    const handleSort = (key) => {
        setSortConfig({
            key,
            direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
        });
    };

    const handleSaveMember = async (memberData, memberId) => {
        const result = await saveMember(memberData, memberId);
        if (result.success) {
            setShowForm(false);
            setEditMember(null);
        } else {
            alert(result.error);
        }
    };

    const handleDeleteMember = async (memberId) => {
        if (confirm('삭제하시겠습니까?')) {
            const result = await deleteMember(memberId);
            if (!result.success) {
                alert(result.error);
            }
        }
    };

    const handleCSVImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const result = await importFromCSV(file);
            alert(`${result.count}명 추가 완료! (중복 제외)`);
            e.target.value = '';
        } catch (error) {
            alert(error.error || 'CSV 가져오기에 실패했습니다.');
        }
    };

    const handleExportCSV = () => {
        const data = {
            headers: ['이름', '닉네임', '생년', '티어', '주라인', '부라인', '비고'],
            rows: filteredAndSortedMembers.map(m => [
                m.name,
                m.nickname,
                m.birthYear || '',
                m.tier || '',
                m.mainPosition || '없음',
                m.subPositions || '',
                m.note || ''
            ])
        };
        exportToCSV(data, '난민클랜원');
    };

    if (loading) return <div className="flex justify-center items-center h-screen">로딩중...</div>;
    if (error) return <div className="text-red-600 text-center p-4">{error}</div>;

    return (
        <div className="p-6">
            {/* 헤더 */}
            <MemberHeader 
                memberCount={members.length}
                search={search}
                onSearchChange={setSearch}
                onAddClick={() => setShowForm(true)}
                onCSVImport={handleCSVImport}
                onCSVExport={handleExportCSV}
            />

            {/* 회원 등록/수정 폼 */}
            <MemberForm
                member={editMember}
                isOpen={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditMember(null);
                }}
                onSave={handleSaveMember}
            />

            {/* 회원 테이블 */}
            <MemberTable
                members={filteredAndSortedMembers}
                sortConfig={sortConfig}
                onSort={handleSort}
                onEdit={(member) => {
                    setEditMember(member);
                    setShowForm(true);
                }}
                onDelete={handleDeleteMember}
                onTierUpdate={updateMemberTier}
                onPositionUpdate={updateMemberPosition}
                onSubPositionsUpdate={updateMemberSubPositions}
            />
        </div>
    );
}

// 헤더 컴포넌트 (별도 파일로 분리 예정)
function MemberHeader({ memberCount, search, onSearchChange, onAddClick, onCSVImport, onCSVExport }) {
    return (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h1 className="text-2xl font-bold mb-3">난민 클랜원 관리 ({memberCount}명)</h1>
            <div className="flex gap-2 flex-wrap">
                <input
                    type="text"
                    placeholder="이름, 닉네임, 생년, 티어, 주라인 검색..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="flex-1 min-w-[200px]"
                />
                <button onClick={onAddClick} className="btn btn-blue">추가</button>
                <label className="btn btn-green">
                    CSV 가져오기
                    <input type="file" accept=".csv" onChange={onCSVImport} className="hidden" />
                </label>
                <button onClick={onCSVExport} className="btn btn-green">CSV 내보내기</button>
            </div>
        </div>
    );
}
